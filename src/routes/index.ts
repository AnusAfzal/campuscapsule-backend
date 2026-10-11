import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import groupRoutes from './groupRoutes';
import inviteRoutes from './inviteRoutes';
import memoryRoutes from './memoryRoutes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/invites', inviteRoutes);
router.use('/memories', memoryRoutes);

export default router;
