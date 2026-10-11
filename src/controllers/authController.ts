import { Request, Response } from 'express';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import {
  generateAuthTokens,
  verifyRefreshToken,
  hashToken,
  getExpiryDateFromDuration,
} from '../utils/jwt';
import { env } from '../config/env';
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types';

/**
 * Formats a user document into a safe user payload without sensitive fields
 */
const formatSafeUser = (user: any) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  profileImage: user.profileImage || '',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Saves a hashed refresh token to the database
 */
const persistRefreshToken = async (userId: any, refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getExpiryDateFromDuration(env.REFRESH_TOKEN_EXPIRES_IN);

  return RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
    isRevoked: false,
  });
};

/**
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, profileImage } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    sendError(res, 'An account with this email address already exists.', 409, {
      code: 'DUPLICATE_EMAIL',
    });
    return;
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: password, // Pre-save hook hashes with bcrypt (salt 12)
    profileImage: profileImage || '',
  });

  const tokens = generateAuthTokens({
    userId: user._id.toString(),
    email: user.email,
  });

  await persistRefreshToken(user._id, tokens.refreshToken);

  sendCreated(
    res,
    {
      user: formatSafeUser(user),
      tokens,
    },
    'Account registered successfully'
  );
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    sendError(res, 'Invalid email or password credentials.', 401, {
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    sendError(res, 'Invalid email or password credentials.', 401, {
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  const tokens = generateAuthTokens({
    userId: user._id.toString(),
    email: user.email,
  });

  await persistRefreshToken(user._id, tokens.refreshToken);

  sendSuccess(
    res,
    {
      user: formatSafeUser(user),
      tokens,
    },
    'Login successful'
  );
};

/**
 * POST /api/auth/refresh
 * Validates, revokes old refresh token, and issues rotated credentials
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    sendError(res, 'Refresh token is required.', 400);
    return;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err: any) {
    sendError(res, 'Invalid or expired session. Please log in again.', 401, {
      code: 'REFRESH_TOKEN_INVALID',
    });
    return;
  }

  const tokenHash = hashToken(refreshToken);
  const tokenDoc = await RefreshToken.findOne({ tokenHash });

  if (!tokenDoc) {
    sendError(res, 'Session not recognized. Please log in again.', 401, {
      code: 'REFRESH_TOKEN_NOT_FOUND',
    });
    return;
  }

  if (tokenDoc.isRevoked) {
    // Potential token reuse attack: revoke all tokens for this user for security
    await RefreshToken.updateMany({ userId: tokenDoc.userId }, { isRevoked: true });
    sendError(res, 'Session has been revoked. Please log in again.', 401, {
      code: 'REFRESH_TOKEN_REVOKED',
    });
    return;
  }

  if (new Date() > tokenDoc.expiresAt) {
    sendError(res, 'Session expired. Please log in again.', 401, {
      code: 'REFRESH_TOKEN_EXPIRED',
    });
    return;
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    sendError(res, 'The user associated with this session no longer exists.', 401);
    return;
  }

  // Rotate token: revoke current token
  tokenDoc.isRevoked = true;
  await tokenDoc.save();

  // Generate new token pair
  const newTokens = generateAuthTokens({
    userId: user._id.toString(),
    email: user.email,
  });

  // Store new refresh token hash
  await persistRefreshToken(user._id, newTokens.refreshToken);

  sendSuccess(
    res,
    {
      user: formatSafeUser(user),
      tokens: newTokens,
    },
    'Session refreshed successfully'
  );
};

/**
 * POST /api/auth/logout
 * Revokes refresh token in database
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body || {};

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.updateOne({ tokenHash }, { isRevoked: true });
  }

  // If user is authenticated via Bearer token, we can also revoke all active tokens for that user
  const authReq = req as AuthenticatedRequest;
  if (authReq.user) {
    await RefreshToken.updateMany(
      { userId: authReq.user._id, isRevoked: false },
      { isRevoked: true }
    );
  }

  sendSuccess(res, null, 'Logged out successfully');
};

/**
 * GET /api/auth/me
 * Protected endpoint returning safe user profile
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  sendSuccess(res, {
    user: formatSafeUser(req.user),
  });
};
