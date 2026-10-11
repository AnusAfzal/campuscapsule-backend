import { Router } from 'express';

import {
  createMemory,
  getGroupMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
  getGroupCalendar,
  getGroupArchive,
} from '../controllers/memoryController';

import {
  authenticate,
  requireGroupMember,
} from '../middleware/auth';

import { uploadMemoryImage } from '../middleware/upload';

import { validateRequest } from '../middleware/validate';

import {
  createMemorySchema,
  updateMemorySchema,
} from '../validators/memoryValidators';

const router = Router();

router.use(authenticate);

/**
 * Create memory
 *
 * Request flow:
 * Authentication
 *      ↓
 * Multer receives image
 *      ↓
 * Zod validates form fields
 *      ↓
 * Controller uploads image to Cloudinary
 *      ↓
 * Memory is saved in MongoDB
 */
router.post(
  '/',
  uploadMemoryImage,
  validateRequest(createMemorySchema),
  createMemory
);

router.get(
  '/groups/:id',
  requireGroupMember,
  getGroupMemories
);

router.get(
  '/groups/:id/calendar',
  requireGroupMember,
  getGroupCalendar
);

router.get(
  '/groups/:id/archive',
  requireGroupMember,
  getGroupArchive
);

router.get(
  '/:id',
  getMemoryById
);

router.patch(
  '/:id',
  validateRequest(updateMemorySchema),
  updateMemory
);

router.delete(
  '/:id',
  deleteMemory
);

export default router;
