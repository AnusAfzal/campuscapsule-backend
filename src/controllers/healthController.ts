import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/apiResponse';
import { env } from '../config/env';

export const getHealth = (_req: Request, res: Response): void => {
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][
    mongoose.connection.readyState
  ] || 'unknown';

  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: {
      status: dbStatus,
      connected: mongoose.connection.readyState === 1,
    },
    version: '1.0.0',
    service: 'campuscapsule-api',
  }, 'CampusCapsule API is running smoothly');
};
