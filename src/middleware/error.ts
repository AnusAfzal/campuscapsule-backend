import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error Details]:', err);

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const keyPatterns = err.keyPattern || {};
    
    // Check for memory compound unique constraint
    if (keyPatterns.memoryDate || (keyPatterns.groupId && keyPatterns.userId && keyPatterns.memoryDate)) {
      sendError(
        res,
        'Daily memory limit reached: You have already preserved a memory for this date in this group.',
        409,
        { code: 'DUPLICATE_DAILY_MEMORY' }
      );
      return;
    }

    // Check for group member duplicate
    if (keyPatterns.groupId && keyPatterns.userId) {
      sendError(res, 'You are already a member of this group.', 409, { code: 'ALREADY_MEMBER' });
      return;
    }

    // Check for duplicate email
    if (keyPatterns.email) {
      sendError(res, 'An account with this email address already exists.', 409, { code: 'DUPLICATE_EMAIL' });
      return;
    }

    // Check for duplicate invite code
    if (keyPatterns.inviteCode) {
      sendError(res, 'This invite code is already taken.', 409, { code: 'DUPLICATE_INVITE_CODE' });
      return;
    }

    sendError(res, 'Duplicate entry violation.', 409);
    return;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(', ');
    sendError(res, `Database validation failed: ${messages}`, 422);
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    sendError(res, `Resource not found with specified identifier format: ${err.value}`, 400);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid authentication token.', 401);
    return;
  }
  if (err.name === 'TokenExpiredError') {
    sendError(res, 'Authentication token has expired. Please log in again.', 401);
    return;
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  sendError(
    res,
    message,
    statusCode,
    env.isDevelopment ? { stack: err.stack } : undefined
  );
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};
