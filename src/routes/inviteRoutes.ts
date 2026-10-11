import { Router } from 'express';
import {
  createInvite,
  getInviteInfo,
  joinGroupByInvite,
  revokeInvite,
} from '../controllers/inviteController';
import {
  authenticate,
  authenticateOptional,
  requireGroupMember,
  requireGroupAdmin,
} from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createInviteSchema } from '../validators/groupValidators';

const router = Router();

// Publicly check invite metadata (can be called before or after login)
router.get('/:code', authenticateOptional, getInviteInfo);

// Protected invite actions
router.post(
  '/groups/:groupId',
  authenticate,
  requireGroupMember,
  requireGroupAdmin,
  validateRequest(createInviteSchema),
  createInvite
);
router.post('/:code/join', authenticate, joinGroupByInvite);
router.delete('/:code', authenticate, revokeInvite);

export default router;
