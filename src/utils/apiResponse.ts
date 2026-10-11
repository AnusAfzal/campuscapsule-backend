import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200,
  meta?: Record<string, any>
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(payload);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully',
  meta?: Record<string, any>
): Response => {
  return sendSuccess(res, data, message, 201, meta);
};

export const sendError = (
  res: Response,
  error: string,
  statusCode = 400,
  details?: any
): Response => {
  const payload: ApiResponse = {
    success: false,
    error,
    ...(details && { data: details }),
  };
  return res.status(statusCode).json(payload);
};
