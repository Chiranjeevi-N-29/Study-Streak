import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';

vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      studyGroup: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      studyGroupMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      groupGoal: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      groupFocusContribution: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
      groupStreak: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      $transaction: vi.fn((fns: any) => Promise.all(fns)),
    },
  };
});

describe('Study Groups API Endpoints', () => {
  const testUserOwner = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Owner User',
    email: 'owner@example.com',
    timezone: 'UTC',
  };

  const testUserMember = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Member User',
    email: 'member@example.com',
    timezone: 'UTC',
  };

  const testUserNonMember = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Stranger User',
    email: 'stranger@example.com',
    timezone: 'UTC',
  };

  const tokenOwner = signToken({ userId: testUserOwner.id });
  const tokenMember = signToken({ userId: testUserMember.id });
  const tokenStranger = signToken({ userId: testUserNonMember.id });

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === testUserOwner.id) return Promise.resolve(testUserOwner);
      if (where.id === testUserMember.id) return Promise.resolve(testUserMember);
      if (where.id === testUserNonMember.id) return Promise.resolve(testUserNonMember);
      return Promise.resolve(null);
    });
  });

  describe('POST /api/groups', () => {
    it('should create a new study group', async () => {
      const mockCreatedGroup = {
        id: 'group-100',
        ownerId: testUserOwner.id,
        name: 'Algorithms Squad',
        description: 'Practice LeetCode together',
        inviteCode: 'INVITE1234',
        maxMembers: 5,
        status: 'ACTIVE',
        members: [{ userId: testUserOwner.id, role: 'OWNER', user: testUserOwner }],
        goals: [],
        streak: { currentStreak: 0, longestStreak: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.studyGroup.findUnique as any).mockResolvedValue(null); // inviteCode check
      (prisma.studyGroup.create as any).mockResolvedValue(mockCreatedGroup);

      const res = await request(app)
        .post('/api/groups')
        .set('Cookie', [`token=${tokenOwner}`])
        .send({
          name: 'Algorithms Squad',
          description: 'Practice LeetCode together',
          maxMembers: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.group.name).toBe('Algorithms Squad');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/groups')
        .send({ name: 'Secret Group' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/groups', () => {
    it("should return all groups user is a member of", async () => {
      const mockMemberships = [
        {
          id: 'mem-1',
          groupId: 'group-100',
          userId: testUserOwner.id,
          role: 'OWNER',
          joinedAt: new Date(),
          group: {
            id: 'group-100',
            name: 'Algorithms Squad',
            description: 'LeetCode',
            status: 'ACTIVE',
            maxMembers: 5,
            inviteCode: 'INVITE1234',
            _count: { members: 2 },
            goals: [],
            streak: { currentStreak: 3, longestStreak: 5 },
            createdAt: new Date(),
          },
        },
      ];

      (prisma.studyGroupMember.findMany as any).mockResolvedValue(mockMemberships);

      const res = await request(app)
        .get('/api/groups')
        .set('Cookie', [`token=${tokenOwner}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.groups.length).toBe(1);
      expect(res.body.groups[0].name).toBe('Algorithms Squad');
      expect(res.body.groups[0].userRole).toBe('OWNER');
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should return group details for a group member', async () => {
      const groupId = 'group-100';

      (prisma.studyGroupMember.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.groupId_userId?.userId === testUserOwner.id) {
          return Promise.resolve({ groupId, userId: testUserOwner.id, role: 'OWNER' });
        }
        return Promise.resolve(null);
      });

      (prisma.studyGroup.findUnique as any).mockResolvedValue({
        id: groupId,
        name: 'Algorithms Squad',
        description: 'LeetCode',
        inviteCode: 'INVITE1234',
        maxMembers: 5,
        status: 'ACTIVE',
        ownerId: testUserOwner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 2 },
        members: [
          { userId: testUserOwner.id, role: 'OWNER', joinedAt: new Date(), user: testUserOwner },
          { userId: testUserMember.id, role: 'MEMBER', joinedAt: new Date(), user: testUserMember },
        ],
        goals: [],
        streak: { currentStreak: 2, longestStreak: 4, lastActiveDate: '2026-09-08' },
      });

      (prisma.groupFocusContribution.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/groups/${groupId}`)
        .set('Cookie', [`token=${tokenOwner}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.group.name).toBe('Algorithms Squad');
      expect(res.body.group.members.length).toBe(2);
    });

    it('should forbid non-members from reading group details', async () => {
      const groupId = 'group-100';

      (prisma.studyGroupMember.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/groups/${groupId}`)
        .set('Cookie', [`token=${tokenStranger}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/groups/join', () => {
    it('should join group successfully with valid invite code', async () => {
      const inviteCode = 'INVITE1234';

      (prisma.studyGroup.findUnique as any).mockResolvedValue({
        id: 'group-100',
        name: 'Algorithms Squad',
        status: 'ACTIVE',
        maxMembers: 5,
        _count: { members: 2 },
      });

      (prisma.studyGroupMember.findUnique as any).mockResolvedValue(null); // Not already a member
      (prisma.studyGroupMember.create as any).mockResolvedValue({
        id: 'mem-99',
        groupId: 'group-100',
        userId: testUserNonMember.id,
        role: 'MEMBER',
        user: testUserNonMember,
      });

      (prisma.studyGroupMember.findMany as any).mockResolvedValue([]); // Admins to notify

      const res = await request(app)
        .post('/api/groups/join')
        .set('Cookie', [`token=${tokenStranger}`])
        .send({ inviteCode });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.membership.role).toBe('MEMBER');
    });

    it('should reject invalid invite code', async () => {
      (prisma.studyGroup.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/groups/join')
        .set('Cookie', [`token=${tokenStranger}`])
        .send({ inviteCode: 'BADCODE' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/groups/:id/leave', () => {
    it('should prevent owner from leaving without transferring ownership', async () => {
      const groupId = 'group-100';

      (prisma.studyGroupMember.findUnique as any).mockResolvedValue({
        groupId,
        userId: testUserOwner.id,
        role: 'OWNER',
      });

      const res = await request(app)
        .post(`/api/groups/${groupId}/leave`)
        .set('Cookie', [`token=${tokenOwner}`]);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OWNER_CANNOT_LEAVE');
    });
  });
});
