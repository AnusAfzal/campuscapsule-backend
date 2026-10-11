import { Router } from 'express';
import {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  getGroupMembers,
  removeMember,
} from '../controllers/groupController';
import { authenticate, requireGroupMember, requireGroupAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createGroupSchema, updateGroupSchema } from '../validators/groupValidators';

const router = Router();

// All group routes require authentication
router.use(authenticate);

router.post('/', validateRequest(createGroupSchema), createGroup);
router.get('/', getUserGroups);

router.get('/:id', requireGroupMember, getGroupById);
router.patch('/:id', requireGroupMember, requireGroupAdmin, validateRequest(updateGroupSchema), updateGroup);
router.get('/:id/members', requireGroupMember, getGroupMembers);
router.delete('/:id/members/:userId', requireGroupMember, removeMember);

export default router;
