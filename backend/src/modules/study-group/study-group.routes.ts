import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './study-group.controller.js';

const router = Router();

// All group routes require authentication
router.use(requireAuth);

// Group CRUD
router.post('/', ctrl.createGroup);
router.get('/', ctrl.getUserGroups);
router.get('/:id', ctrl.getGroupById);
router.patch('/:id', ctrl.updateGroup);
router.delete('/:id', ctrl.archiveGroup);

// Invite management
router.post('/:id/regenerate-invite', ctrl.regenerateInviteCode);

// Membership actions
router.post('/join', ctrl.joinGroup);
router.post('/:id/leave', ctrl.leaveGroup);
router.post('/:id/transfer-ownership', ctrl.transferOwnership);

// Member management
router.get('/:id/members', ctrl.getMembers);
router.patch('/:id/members/:userId', ctrl.updateMemberRole);
router.delete('/:id/members/:userId', ctrl.removeMember);

// Group goals
router.post('/:id/goals', ctrl.createGroupGoal);

// Progress & analytics
router.get('/:id/progress', ctrl.getGroupProgress);

export default router;
