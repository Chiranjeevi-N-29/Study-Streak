import { Request, Response, NextFunction } from 'express';
import * as groupService from './study-group.service.js';
import {
  createGroupSchema,
  updateGroupSchema,
  joinGroupSchema,
  updateMemberRoleSchema,
  transferOwnershipSchema,
  createGroupGoalSchema,
} from './study-group.schema.js';

// ─── Group CRUD ───────────────────────────────────────────────────────────────

export const createGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createGroupSchema.parse(req.body);
    const result = await groupService.createGroup(req.user!.id, input);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getUserGroups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await groupService.getUserGroups(req.user!.id);
    res.json({ success: true, groups });
  } catch (err) {
    next(err);
  }
};

export const getGroupById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = await groupService.getGroupById(req.user!.id, req.params.id);
    res.json({ success: true, group });
  } catch (err) {
    next(err);
  }
};

export const updateGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateGroupSchema.parse(req.body);
    const group = await groupService.updateGroup(req.user!.id, req.params.id, input);
    res.json({ success: true, group });
  } catch (err) {
    next(err);
  }
};

export const archiveGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = await groupService.archiveGroup(req.user!.id, req.params.id);
    res.json({ success: true, group });
  } catch (err) {
    next(err);
  }
};

export const regenerateInviteCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await groupService.regenerateInviteCode(req.user!.id, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// ─── Membership ───────────────────────────────────────────────────────────────

export const joinGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = joinGroupSchema.parse(req.body);
    const result = await groupService.joinByInviteCode(req.user!.id, input.inviteCode);
    res.status(201).json({ success: true, group: result.group, membership: result.membership });
  } catch (err) {
    next(err);
  }
};

export const leaveGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await groupService.leaveGroup(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const transferOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = transferOwnershipSchema.parse(req.body);
    const result = await groupService.transferOwnership(req.user!.id, req.params.id, input);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await groupService.getMembers(req.user!.id, req.params.id);
    res.json({ success: true, members });
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await groupService.removeMember(req.user!.id, req.params.id, req.params.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateMemberRoleSchema.parse(req.body);
    const member = await groupService.updateMemberRole(req.user!.id, req.params.id, req.params.userId, input);
    res.json({ success: true, member });
  } catch (err) {
    next(err);
  }
};

// ─── Group Goals ──────────────────────────────────────────────────────────────

export const createGroupGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createGroupGoalSchema.parse(req.body);
    const goal = await groupService.createGroupGoal(req.user!.id, req.params.id, input);
    res.status(201).json({ success: true, goal });
  } catch (err) {
    next(err);
  }
};

export const getGroupProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = await groupService.getGroupProgress(req.user!.id, req.params.id);
    res.json({ success: true, progress });
  } catch (err) {
    next(err);
  }
};
