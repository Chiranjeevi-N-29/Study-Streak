import { prisma } from '../../config/db.js';
import { randomBytes } from 'crypto';
import { GroupMemberRole, StudyGroupStatus, GroupGoalStatus } from '@prisma/client';
import type {
  CreateGroupInput,
  UpdateGroupInput,
  UpdateMemberRoleInput,
  TransferOwnershipInput,
  CreateGroupGoalInput,
} from './study-group.schema.js';
import { createNotification } from '../notification/notification.service.js';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

const createError = (message: string, statusCode: number, code?: string): AppError => {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

/** Generate a cryptographically secure random invite code (10 chars, URL-safe) */
const generateInviteCode = (): string => {
  return randomBytes(8).toString('base64url').slice(0, 10).toUpperCase();
};

/** Get today's date in UTC as YYYY-MM-DD */
const utcDateString = (): string => new Date().toISOString().split('T')[0];

/** Check if user is a member of group and optionally require a minimum role */
const requireMembership = async (
  userId: string,
  groupId: string,
  minRole?: GroupMemberRole
) => {
  const member = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!member) {
    throw createError('Access denied: You are not a member of this group', 403, 'FORBIDDEN');
  }

  if (minRole) {
    const roleOrder: Record<GroupMemberRole, number> = {
      OWNER: 3,
      ADMIN: 2,
      MEMBER: 1,
    };
    if (roleOrder[member.role] < roleOrder[minRole]) {
      throw createError(
        `Insufficient permissions: requires ${minRole} role or higher`,
        403,
        'FORBIDDEN'
      );
    }
  }

  return member;
};

/** Format a member entry for public response (only safe fields) */
const formatMember = (m: any, hasActivityToday: boolean) => ({
  id: m.user.id,
  name: m.user.name,
  role: m.role,
  joinedAt: m.joinedAt,
  hasActivityToday,
});

// ─── Group CRUD ───────────────────────────────────────────────────────────────

export const createGroup = async (userId: string, input: CreateGroupInput) => {
  let inviteCode = generateInviteCode();

  // Ensure uniqueness (probabilistically negligible collision chance)
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.studyGroup.findUnique({ where: { inviteCode } });
    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const group = await prisma.studyGroup.create({
    data: {
      ownerId: userId,
      name: input.name,
      description: input.description || null,
      maxMembers: input.maxMembers,
      inviteCode,
      members: {
        create: {
          userId,
          role: GroupMemberRole.OWNER,
        },
      },
      streak: {
        create: {
          currentStreak: 0,
          longestStreak: 0,
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
      goals: true,
      streak: true,
    },
  });

  return { group, memberCount: 1 };
};

export const getUserGroups = async (userId: string) => {
  const memberships = await prisma.studyGroupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
          goals: { where: { status: GroupGoalStatus.ACTIVE } },
          streak: true,
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    description: m.group.description,
    status: m.group.status,
    maxMembers: m.group.maxMembers,
    memberCount: m.group._count.members,
    userRole: m.role,
    inviteCode: m.group.inviteCode,
    activeGoals: m.group.goals.map((g) => ({
      id: g.id,
      title: g.title,
      targetMinutes: g.targetMinutes,
      currentMinutes: g.currentMinutes,
      progressPct: g.targetMinutes > 0
        ? Math.min(100, Math.round((g.currentMinutes / g.targetMinutes) * 100))
        : 0,
      status: g.status,
    })),
    streak: m.group.streak
      ? { currentStreak: m.group.streak.currentStreak, longestStreak: m.group.streak.longestStreak }
      : { currentStreak: 0, longestStreak: 0 },
    createdAt: m.group.createdAt,
    joinedAt: m.joinedAt,
  }));
};

export const getGroupById = async (userId: string, groupId: string) => {
  // Validate membership
  await requireMembership(userId, groupId);

  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      },
      goals: { orderBy: { createdAt: 'desc' } },
      streak: true,
      _count: { select: { members: true } },
    },
  });

  if (!group) throw createError('Study group not found', 404);

  // Determine who is active today (UTC) — use GroupFocusContribution date
  const today = utcDateString();
  const activeUserIds = await getActiveUserIdsForDate(groupId, today);

  const members = group.members.map((m) =>
    formatMember(m, activeUserIds.has(m.userId))
  );

  const goals = group.goals.map((g) => ({
    ...g,
    progressPct: g.targetMinutes > 0
      ? Math.min(100, Math.round((g.currentMinutes / g.targetMinutes) * 100))
      : 0,
  }));

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    inviteCode: group.inviteCode,
    maxMembers: group.maxMembers,
    status: group.status,
    ownerId: group.ownerId,
    memberCount: group._count.members,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members,
    goals,
    streak: group.streak
      ? { currentStreak: group.streak.currentStreak, longestStreak: group.streak.longestStreak, lastActiveDate: group.streak.lastActiveDate }
      : { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  };
};

export const updateGroup = async (userId: string, groupId: string, input: UpdateGroupInput) => {
  const member = await requireMembership(userId, groupId, GroupMemberRole.ADMIN);

  // Only OWNER can set maxMembers; ADMIN can change name/description
  if (input.maxMembers !== undefined && member.role !== GroupMemberRole.OWNER) {
    throw createError('Only the group owner can change the member limit', 403, 'FORBIDDEN');
  }

  if (input.maxMembers !== undefined) {
    const currentCount = await prisma.studyGroupMember.count({ where: { groupId } });
    if (input.maxMembers < currentCount) {
      throw createError(
        `Cannot set maxMembers below current member count (${currentCount})`,
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const updated = await prisma.studyGroup.update({
    where: { id: groupId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.maxMembers !== undefined ? { maxMembers: input.maxMembers } : {}),
    },
  });

  return updated;
};

export const archiveGroup = async (userId: string, groupId: string) => {
  await requireMembership(userId, groupId, GroupMemberRole.OWNER);
  return prisma.studyGroup.update({
    where: { id: groupId },
    data: { status: StudyGroupStatus.ARCHIVED },
  });
};

export const regenerateInviteCode = async (userId: string, groupId: string) => {
  await requireMembership(userId, groupId, GroupMemberRole.ADMIN);

  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.studyGroup.findUnique({ where: { inviteCode } });
    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  return prisma.studyGroup.update({
    where: { id: groupId },
    data: { inviteCode },
    select: { inviteCode: true },
  });
};

// ─── Membership ───────────────────────────────────────────────────────────────

export const joinByInviteCode = async (userId: string, inviteCode: string) => {
  const group = await prisma.studyGroup.findUnique({
    where: { inviteCode },
    include: { _count: { select: { members: true } } },
  });

  if (!group) throw createError('Invalid invite code', 404, 'NOT_FOUND');
  if (group.status === StudyGroupStatus.ARCHIVED) {
    throw createError('This group is no longer active', 400, 'VALIDATION_ERROR');
  }
  if (group._count.members >= group.maxMembers) {
    throw createError('This group is full', 400, 'GROUP_FULL');
  }

  const existing = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (existing) throw createError('You are already a member of this group', 409, 'CONFLICT');

  const membership = await prisma.studyGroupMember.create({
    data: { groupId: group.id, userId, role: GroupMemberRole.MEMBER },
    include: { user: { select: { id: true, name: true } } },
  });

  // Notify joiner
  try {
    await createNotification({
      userId,
      type: 'GROUP_JOINED',
      title: 'Joined Study Group',
      message: `You joined "${group.name}". Study together and stay accountable!`,
      link: `/app/groups/${group.id}`,
      eventKey: `group_joined_${group.id}_${userId}`,
    });
  } catch (_) {}

  // Notify owner/admins about new member
  try {
    const admins = await prisma.studyGroupMember.findMany({
      where: {
        groupId: group.id,
        role: { in: [GroupMemberRole.OWNER, GroupMemberRole.ADMIN] },
        userId: { not: userId },
      },
    });
    for (const admin of admins) {
      await createNotification({
        userId: admin.userId,
        type: 'GROUP_MEMBER_JOINED',
        title: 'New Group Member',
        message: `${membership.user.name} joined "${group.name}"!`,
        link: `/app/groups/${group.id}`,
        eventKey: `group_member_joined_${group.id}_${userId}_${admin.userId}`,
      });
    }
  } catch (_) {}

  return { membership, group };
};

export const leaveGroup = async (userId: string, groupId: string) => {
  const member = await requireMembership(userId, groupId);

  if (member.role === GroupMemberRole.OWNER) {
    throw createError(
      'Group owners must transfer ownership before leaving. Use POST /transfer-ownership.',
      400,
      'OWNER_CANNOT_LEAVE'
    );
  }

  await prisma.studyGroupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  return { success: true };
};

export const transferOwnership = async (
  userId: string,
  groupId: string,
  input: TransferOwnershipInput
) => {
  await requireMembership(userId, groupId, GroupMemberRole.OWNER);

  const targetMember = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId: input.newOwnerId } },
  });

  if (!targetMember) {
    throw createError('Target user is not a member of this group', 404, 'NOT_FOUND');
  }
  if (input.newOwnerId === userId) {
    throw createError('You are already the owner', 400, 'VALIDATION_ERROR');
  }

  await prisma.$transaction([
    prisma.studyGroupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role: GroupMemberRole.ADMIN },
    }),
    prisma.studyGroupMember.update({
      where: { groupId_userId: { groupId, userId: input.newOwnerId } },
      data: { role: GroupMemberRole.OWNER },
    }),
    prisma.studyGroup.update({
      where: { id: groupId },
      data: { ownerId: input.newOwnerId },
    }),
  ]);

  return { success: true };
};

export const removeMember = async (userId: string, groupId: string, targetUserId: string) => {
  const actorMember = await requireMembership(userId, groupId, GroupMemberRole.ADMIN);

  const targetMember = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  if (!targetMember) throw createError('Target user is not a member of this group', 404);

  // ADMIN can only remove MEMBERs, not other ADMINs or OWNER
  if (actorMember.role === GroupMemberRole.ADMIN && targetMember.role !== GroupMemberRole.MEMBER) {
    throw createError('Admins can only remove regular members', 403, 'FORBIDDEN');
  }

  // Cannot remove the owner
  if (targetMember.role === GroupMemberRole.OWNER) {
    throw createError('Cannot remove the group owner', 403, 'FORBIDDEN');
  }

  await prisma.studyGroupMember.delete({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  return { success: true };
};

export const updateMemberRole = async (
  userId: string,
  groupId: string,
  targetUserId: string,
  input: UpdateMemberRoleInput
) => {
  await requireMembership(userId, groupId, GroupMemberRole.OWNER);

  const targetMember = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  if (!targetMember) throw createError('Target user is not a member of this group', 404);
  if (targetMember.role === GroupMemberRole.OWNER) {
    throw createError('Cannot change owner role directly. Use transfer-ownership.', 400, 'VALIDATION_ERROR');
  }

  return prisma.studyGroupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { role: input.role as GroupMemberRole },
    include: { user: { select: { id: true, name: true } } },
  });
};

export const getMembers = async (userId: string, groupId: string) => {
  await requireMembership(userId, groupId);

  const members = await prisma.studyGroupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });

  const today = utcDateString();
  const activeUserIds = await getActiveUserIdsForDate(groupId, today);

  return members.map((m) => formatMember(m, activeUserIds.has(m.userId)));
};

// ─── Group Goals ──────────────────────────────────────────────────────────────

export const createGroupGoal = async (userId: string, groupId: string, input: CreateGroupGoalInput) => {
  await requireMembership(userId, groupId, GroupMemberRole.ADMIN);

  const goal = await prisma.groupGoal.create({
    data: {
      groupId,
      title: input.title,
      description: input.description || null,
      targetMinutes: input.targetMinutes,
    },
  });

  return { ...goal, progressPct: 0 };
};

export const recalculateGroupGoalProgress = async (groupGoalId: string) => {
  // Aggregate all contributions
  const agg = await prisma.groupFocusContribution.aggregate({
    where: { groupGoalId },
    _sum: { durationSeconds: true },
  });

  const totalSeconds = agg._sum.durationSeconds ?? 0;
  const currentMinutes = Math.floor(totalSeconds / 60);

  const goal = await prisma.groupGoal.findUnique({ where: { id: groupGoalId } });
  if (!goal) return null;

  const isNowComplete =
    goal.status === GroupGoalStatus.ACTIVE && currentMinutes >= goal.targetMinutes;

  const updated = await prisma.groupGoal.update({
    where: { id: groupGoalId },
    data: {
      currentMinutes,
      ...(isNowComplete
        ? { status: GroupGoalStatus.COMPLETED, completedAt: new Date() }
        : {}),
    },
  });

  if (isNowComplete) {
    // Notify all members of goal completion
    try {
      const members = await prisma.studyGroupMember.findMany({
        where: { groupId: goal.groupId },
        select: { userId: true },
      });
      const group = await prisma.studyGroup.findUnique({ where: { id: goal.groupId }, select: { name: true } });
      for (const m of members) {
        await createNotification({
          userId: m.userId,
          type: 'GROUP_GOAL_MILESTONE',
          title: 'Group Goal Achieved! 🎉',
          message: `Your group "${group?.name}" completed the goal: "${goal.title}"!`,
          link: `/app/groups/${goal.groupId}`,
          eventKey: `group_goal_completed_${groupGoalId}_${m.userId}`,
        });
      }
    } catch (_) {}
  }

  return {
    ...updated,
    progressPct: updated.targetMinutes > 0
      ? Math.min(100, Math.round((updated.currentMinutes / updated.targetMinutes) * 100))
      : 0,
  };
};

export const contributeToGroupGoal = async (
  userId: string,
  groupGoalId: string,
  focusSessionId: string,
  durationSeconds: number
) => {
  // Validate goal exists and user is a member of its group
  const goal = await prisma.groupGoal.findUnique({ where: { id: groupGoalId } });
  if (!goal) return;

  await requireMembership(userId, goal.groupId);

  if (goal.status !== GroupGoalStatus.ACTIVE) return;

  // Idempotent — skip if already contributed for this session
  const existing = await prisma.groupFocusContribution.findUnique({
    where: { groupGoalId_focusSessionId: { groupGoalId, focusSessionId } },
  });
  if (existing) return;

  await prisma.groupFocusContribution.create({
    data: {
      groupGoalId,
      userId,
      focusSessionId,
      durationSeconds,
      date: utcDateString(),
    },
  });

  await recalculateGroupGoalProgress(groupGoalId);
  await recalculateGroupStreak(goal.groupId);
};

// ─── Group Streak ─────────────────────────────────────────────────────────────

export const recalculateGroupStreak = async (groupId: string) => {
  // Get all distinct UTC dates with any contribution for this group's goals
  const contributions = await prisma.groupFocusContribution.findMany({
    where: { groupGoal: { groupId } },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'desc' },
  });

  const activeDates = new Set(contributions.map((c) => c.date));
  const today = utcDateString();
  const yesterday = offsetDate(today, -1);

  let currentStreak = 0;
  // Streak counts today and backwards consecutively
  let checkDate = activeDates.has(today) ? today : activeDates.has(yesterday) ? yesterday : null;

  if (checkDate) {
    let cur = checkDate;
    while (activeDates.has(cur)) {
      currentStreak++;
      cur = offsetDate(cur, -1);
    }
  }

  const existingStreak = await prisma.groupStreak.findUnique({ where: { groupId } });
  const longestStreak = Math.max(existingStreak?.longestStreak ?? 0, currentStreak);

  await prisma.groupStreak.upsert({
    where: { groupId },
    update: {
      currentStreak,
      longestStreak,
      lastActiveDate: activeDates.has(today) ? today : (existingStreak?.lastActiveDate ?? null),
    },
    create: {
      groupId,
      currentStreak,
      longestStreak,
      lastActiveDate: activeDates.has(today) ? today : null,
    },
  });
};

/** Add/subtract N days from a YYYY-MM-DD string (UTC) */
const offsetDate = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

/** Get set of userIds who contributed to any group goal today (UTC) */
const getActiveUserIdsForDate = async (groupId: string, date: string): Promise<Set<string>> => {
  const contributions = await prisma.groupFocusContribution.findMany({
    where: { groupGoal: { groupId }, date },
    select: { userId: true },
  });
  return new Set(contributions.map((c) => c.userId));
};

// ─── Group Progress ───────────────────────────────────────────────────────────

export const getGroupProgress = async (userId: string, groupId: string) => {
  await requireMembership(userId, groupId);

  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
      goals: { where: { status: GroupGoalStatus.ACTIVE } },
      streak: true,
      _count: { select: { members: true } },
    },
  });

  if (!group) throw createError('Group not found', 404);

  const today = utcDateString();
  const activeUserIds = await getActiveUserIdsForDate(groupId, today);

  // Weekly aggregate: minutes contributed per member in the last 7 days
  const sevenDaysAgo = offsetDate(today, -6);
  const weeklyContributions = await prisma.groupFocusContribution.groupBy({
    by: ['userId'],
    where: {
      groupGoal: { groupId },
      date: { gte: sevenDaysAgo, lte: today },
    },
    _sum: { durationSeconds: true },
  });

  const memberMap = new Map(group.members.map((m) => [m.userId, m.user.name]));
  const leaderboard = weeklyContributions
    .map((c) => ({
      name: memberMap.get(c.userId) ?? 'Unknown',
      weeklyMinutes: Math.floor((c._sum.durationSeconds ?? 0) / 60),
    }))
    .sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);

  const goals = group.goals.map((g) => ({
    id: g.id,
    title: g.title,
    targetMinutes: g.targetMinutes,
    currentMinutes: g.currentMinutes,
    progressPct: g.targetMinutes > 0
      ? Math.min(100, Math.round((g.currentMinutes / g.targetMinutes) * 100))
      : 0,
    status: g.status,
  }));

  return {
    memberCount: group._count.members,
    activeTodayCount: activeUserIds.size,
    members: group.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
      hasActivityToday: activeUserIds.has(m.userId),
    })),
    goals,
    streak: group.streak
      ? { currentStreak: group.streak.currentStreak, longestStreak: group.streak.longestStreak }
      : { currentStreak: 0, longestStreak: 0 },
    leaderboard,
  };
};
