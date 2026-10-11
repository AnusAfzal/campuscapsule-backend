import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { JWTPayload, AuthTokens } from '../types';

/**
 * Generates short-lived access token
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as any,
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

/**
 * Generates longer-lived refresh token
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any,
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

/**
 * Generates both access and refresh tokens
 */
export const generateAuthTokens = (payload: JWTPayload): AuthTokens => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Verifies short-lived access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
};

/**
 * Verifies refresh token signature
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JWTPayload;
};

/**
 * Securely hashes a token with SHA-256 for database storage
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Calculates expiration Date based on duration string (e.g. '30d', '7d')
 */
export const getExpiryDateFromDuration = (durationStr: string): Date => {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  const now = Date.now();
  if (!match) {
    // Default to 30 days
    return new Date(now + 30 * 24 * 60 * 60 * 1000);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  let multiplier = 1000;
  if (unit === 's') multiplier = 1000;
  else if (unit === 'm') multiplier = 60 * 1000;
  else if (unit === 'h') multiplier = 60 * 60 * 1000;
  else if (unit === 'd') multiplier = 24 * 60 * 60 * 1000;

  return new Date(now + value * multiplier);
};
