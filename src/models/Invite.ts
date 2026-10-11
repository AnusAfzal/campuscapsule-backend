import mongoose, { Schema } from 'mongoose';
import { IInvite } from '../types';

const inviteSchema = new Schema<IInvite>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    inviteCode: {
      type: String,
      required: [true, 'Invite code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    maxUses: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Invite = mongoose.model<IInvite>('Invite', inviteSchema);
