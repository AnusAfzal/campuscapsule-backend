import { NextFunction, Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { Invite } from '../models/Invite';
import { Group } from '../models/Group';
import { GroupMember } from '../models/GroupMember';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse';

// Generate human-friendly alphanumeric invite code (e.g. SE26X7K)
const generateInviteCode = (): string => {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
};

export const createInvite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  const groupId = new Types.ObjectId(req.params.groupId);
  const { expiresInDays = 7, maxUses = 0 } = req.body;

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const inviteCode = generateInviteCode();

  const invite = await Invite.create({
    groupId,
    createdBy: req.user._id,
    inviteCode,
    expiresAt,
    maxUses,
    usedCount: 0,
    isRevoked: false,
  });

  const deepLink = `campuscapsule://join/${inviteCode}`;

  sendCreated(
    res,
    {
      invite,
      deepLink,
    },
    'Invite generated successfully'
  );
};

export const getInviteInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const code = (req.params.code || '').trim().toUpperCase();

  const invite = await Invite.findOne({ inviteCode: code });
  if (!invite) {
    sendError(res, 'Invite code not found or invalid.', 404);
    return;
  }

  if (invite.isRevoked) {
    sendError(res, 'This invite has been revoked by an administrator.', 410);
    return;
  }

  if (new Date() >= invite.expiresAt) {
    sendError(res, 'This invite has expired.', 410);
    return;
  }

  const group = await Group.findById(invite.groupId);
  if (!group) {
    sendError(res, 'Group associated with this invite no longer exists.', 404);
    return;
  }

  const memberCount = await GroupMember.countDocuments({ groupId: group._id });
  let alreadyMember = false;

  if (req.user) {
    const existing = await GroupMember.findOne({
      groupId: group._id,
      userId: req.user._id,
    });
    if (existing) alreadyMember = true;
  }

  if (
    !alreadyMember &&
    invite.maxUses &&
    invite.maxUses > 0 &&
    invite.usedCount >= invite.maxUses
  ) {
    sendError(res, 'This invite has reached its maximum number of uses.', 410);
    return;
  }

  sendSuccess(res, {
    group: {
      id: group._id,
      name: group.name,
      description: group.description,
      coverImage: group.coverImage,
      memberCount,
    },
    invite: {
      code: invite.inviteCode,
      expiresAt: invite.expiresAt,
    },
    alreadyMember,
  });
};

export const joinGroupByInvite = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Authentication required to join group', 401);
    return;
  }

  const code = (req.params.code || '').trim().toUpperCase();
  const invite = await Invite.findOne({ inviteCode: code });

  if (!invite) {
    sendError(res, 'Invite code not found or invalid.', 404);
    return;
  }

  if (invite.isRevoked) {
    sendError(res, 'This invite has been revoked.', 410);
    return;
  }

  const now = new Date();
  if (now >= invite.expiresAt) {
    sendError(res, 'This invite has expired.', 410);
    return;
  }

  if (invite.maxUses && invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
    sendError(res, 'This invite has reached its maximum uses.', 410);
    return;
  }

  // Check if user is already a member
  const existing = await GroupMember.findOne({
    groupId: invite.groupId,
    userId: req.user._id,
  });

  if (existing) {
    sendError(res, 'You are already a member of this group.', 409);
    return;
  }

  // Reserve a use atomically so concurrent joins cannot exceed maxUses.
  const reservedInvite = await Invite.findOneAndUpdate(
    {
      _id: invite._id,
      isRevoked: false,
      expiresAt: { $gt: now },
      $expr: {
        $or: [
          { $lte: ['$maxUses', 0] },
          { $lt: ['$usedCount', '$maxUses'] },
        ],
      },
    },
    { $inc: { usedCount: 1 } },
    { new: true }
  );

  if (!reservedInvite) {
    const currentInvite = await Invite.findById(invite._id);

    if (!currentInvite) {
      sendError(res, 'Invite code not found or invalid.', 404);
    } else if (currentInvite.isRevoked) {
      sendError(res, 'This invite has been revoked.', 410);
    } else if (now >= currentInvite.expiresAt) {
      sendError(res, 'This invite has expired.', 410);
    } else if (
      (currentInvite.maxUses ?? 0) > 0 &&
      currentInvite.usedCount >= (currentInvite.maxUses ?? 0)
    ) {
      sendError(res, 'This invite has reached its maximum uses.', 410);
    } else {
      sendError(res, 'This invite is no longer available. Please try again.', 409);
    }
    return;
  }

  try {
    await GroupMember.create({
      groupId: reservedInvite.groupId,
      userId: req.user._id,
      role: 'member',
      joinedAt: new Date(),
    });
  } catch (error) {
    try {
      await Invite.updateOne(
        { _id: reservedInvite._id, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      );
    } catch (rollbackError) {
      console.error('[Invites] Failed to release reserved invite use:', rollbackError);
      next(rollbackError);
      return;
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 11000
    ) {
      sendError(res, 'You are already a member of this group.', 409);
      return;
    }

    next(error);
    return;
  }

  const group = await Group.findById(reservedInvite.groupId);

  sendSuccess(
    res,
    {
      group,
      role: 'member',
    },
    'You have successfully joined the group!'
  );
};

export const revokeInvite = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const code = (req.params.code || '').trim().toUpperCase();
  const invite = await Invite.findOne({ inviteCode: code });

  if (!invite) {
    sendError(res, 'Invite not found', 404);
    return;
  }

  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  const membership = await GroupMember.findOne({
    groupId: invite.groupId,
    userId: req.user._id,
  });

  if (membership?.role !== 'admin') {
    sendError(res, 'Permission denied. Only group admins can revoke invites.', 403);
    return;
  }

  invite.isRevoked = true;
  await invite.save();

  sendSuccess(res, null, 'Invite revoked successfully');
};
