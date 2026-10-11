import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type UserRole = 'admin' | 'member';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGroupMember extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  userId: Types.ObjectId;
  role: UserRole;
  joinedAt: Date;
}

export interface IInvite extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  createdBy: Types.ObjectId;
  inviteCode: string;
  expiresAt: Date;
  isRevoked: boolean;
  maxUses?: number;
  usedCount: number;
  createdAt: Date;
}

export interface IMemoryLocation {
  latitude?: number;
  longitude?: number;
  readableName?: string;
}

export interface IMemory extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  userId: Types.ObjectId;
  imageUrl: string;
  cloudinaryPublicId: string;
  memoryDate: string; // ISO date format YYYY-MM-DD
  caption?: string;
  location?: IMemoryLocation;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  membership?: IGroupMember;
}
