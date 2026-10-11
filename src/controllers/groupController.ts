import { Response } from 'express';
import { Types } from 'mongoose';
import { Group } from '../models/Group';
import { GroupMember } from '../models/GroupMember';
import { Memory } from '../models/Memory';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse';

export const createGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  const { name, description, coverImage } = req.body;

  const group = await Group.create({
    name,
    description: description || '',
    coverImage: coverImage || '',
    createdBy: req.user._id,
  });

  // Automatically make the creator an admin member
  await GroupMember.create({
    groupId: group._id,
    userId: req.user._id,
    role: 'admin',
    joinedAt: new Date(),
  });

  sendCreated(
    res,
    {
      group,
      role: 'admin',
    },
    'Group created successfully'
  );
};

export const getUserGroups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  const memberships = await GroupMember.find({ userId: req.user._id })
    .populate('groupId')
    .sort({ joinedAt: -1 });

  const groups = await Promise.all(
    memberships
      .filter((m) => m.groupId !== null)
      .map(async (m) => {
        const groupObj: any = (m.groupId as any).toJSON ? (m.groupId as any).toJSON() : m.groupId;
        const memberCount = await GroupMember.countDocuments({ groupId: groupObj._id });
        const memoryCount = await Memory.countDocuments({ groupId: groupObj._id });
        return {
          ...groupObj,
          userRole: m.role,
          joinedAt: m.joinedAt,
          memberCount,
          memoryCount,
        };
      })
  );

  sendSuccess(res, groups, 'User groups retrieved');
};

export const getGroupById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    sendError(res, 'Group not found', 404);
    return;
  }

  const memberCount = await GroupMember.countDocuments({ groupId: group._id });
  const memoryCount = await Memory.countDocuments({ groupId: group._id });

  sendSuccess(res, {
    group,
    role: req.membership?.role,
    memberCount,
    memoryCount,
  });
};

export const updateGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description, coverImage } = req.body;
  const group = await Group.findById(req.params.id);

  if (!group) {
    sendError(res, 'Group not found', 404);
    return;
  }

  if (name) group.name = name;
  if (description !== undefined) group.description = description;
  if (coverImage !== undefined) group.coverImage = coverImage;

  await group.save();
  sendSuccess(res, group, 'Group updated successfully');
};

export const getGroupMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const groupId = new Types.ObjectId(req.params.id);
  const members = await GroupMember.find({ groupId })
    .populate('userId', 'name email profileImage createdAt')
    .sort({ joinedAt: 1 });

  const formatted = members.map((m) => ({
    membershipId: m._id,
    user: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
  }));

  sendSuccess(res, formatted, 'Group members retrieved');
};

export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const groupId = new Types.ObjectId(req.params.id);
  const targetUserId = new Types.ObjectId(req.params.userId);

  const isSelf = req.user?._id.equals(targetUserId);
  const isAdmin = req.membership?.role === 'admin';

  if (!isSelf && !isAdmin) {
    sendError(res, 'Permission denied. Only admins can remove other members.', 403);
    return;
  }

  // If admin is leaving, ensure there's at least one other admin or member
  if (isSelf && isAdmin) {
    const adminCount = await GroupMember.countDocuments({ groupId, role: 'admin' });
    if (adminCount <= 1) {
      const otherMembers = await GroupMember.find({ groupId, userId: { $ne: targetUserId } }).limit(1);
      if (otherMembers.length > 0) {
        // Promote next member to admin
        otherMembers[0].role = 'admin';
        await otherMembers[0].save();
      }
    }
  }

  await GroupMember.deleteOne({ groupId, userId: targetUserId });
  sendSuccess(res, null, isSelf ? 'You have left the group' : 'Member removed successfully');
};
