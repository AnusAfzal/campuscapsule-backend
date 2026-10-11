import mongoose, { Schema } from 'mongoose';
import { IMemory } from '../types';

const memorySchema = new Schema<IMemory>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    cloudinaryPublicId: {
      type: String,
      required: [true, 'Cloudinary public identifier is required'],
    },
    memoryDate: {
      type: String,
      required: [true, 'Memory date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Memory date must be in YYYY-MM-DD format'],
      index: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
      default: '',
    },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      readableName: { type: String, trim: true, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// CRITICAL PRODUCTION REQUIREMENT:
// Enforce one memory per user per calendar day within a group at the database level!
memorySchema.index({ groupId: 1, userId: 1, memoryDate: 1 }, { unique: true });

// Performance index for chronological queries and calendar filtering
memorySchema.index({ groupId: 1, memoryDate: -1 });

export const Memory = mongoose.model<IMemory>('Memory', memorySchema);
