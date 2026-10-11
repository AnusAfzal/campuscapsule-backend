import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';
import { GroupMember } from '../models/GroupMember';
import { AuthenticatedRequest } from '../types';
import { sendError } from '../utils/apiResponse';

const authenticateRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  required: boolean
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) {
        sendError(res, 'Authentication required. No token provided.', 401);
      } else {
        next();
      }
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Malformed authorization header.', 401);
      return;
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        sendError(res, 'Access token has expired. Please refresh your session.', 401, {
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      sendError(res, 'Invalid authentication token.', 401, { code: 'TOKEN_INVALID' });
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      sendError(res, 'The user belonging to this token no longer exists.', 401);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => authenticateRequest(req, res, next, true);

export const authenticateOptional = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => authenticateRequest(req, res, next, false);

export const requireGroupMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required.', 401);
      return;
    }

    const rawGroupId = req.params.groupId || req.params.id || req.body.groupId;
    if (!rawGroupId || !Types.ObjectId.isValid(rawGroupId)) {
      sendError(res, 'Valid Group ID is required.', 400);
      return;
    }

    const groupId = new Types.ObjectId(rawGroupId);
    const membership = await GroupMember.findOne({
      groupId,
      userId: req.user._id,
    });

    if (!membership) {
      sendError(res, 'Access denied. You are not a member of this group.', 403);
      return;
    }

    req.membership = membership;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireGroupAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.membership) {
      await requireGroupMember(req, res, () => {});
    }

    if (req.membership?.role !== 'admin') {
      sendError(res, 'Access denied. Group admin privileges required.', 403);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
