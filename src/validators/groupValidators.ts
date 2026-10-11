import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Group name must be at least 2 characters').max(80, 'Group name must not exceed 80 characters'),
    description: z.string().max(300, 'Description cannot exceed 300 characters').optional().default(''),
    coverImage: z.string().url('Invalid cover image URL').optional().or(z.literal('')),
  }),
});

export const updateGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(300).optional(),
    coverImage: z.string().url().optional().or(z.literal('')),
  }),
});

export const createInviteSchema = z.object({
  body: z.object({
    expiresInDays: z.number().int().positive().optional().default(7),
    maxUses: z.number().int().nonnegative().optional().default(0),
  }),
});

export const joinByInviteSchema = z.object({
  params: z.object({
    code: z.string().min(4, 'Invalid invite code format').max(20),
  }),
});
