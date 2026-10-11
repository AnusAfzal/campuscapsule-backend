import { Response } from 'express';
import { Types } from 'mongoose';
import { Memory } from '../models/Memory';
import { GroupMember } from '../models/GroupMember';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse';
import {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
} from '../services/cloudinaryService';

export const createMemory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  // Multer will place the uploaded image here.
  if (!req.file) {
    sendError(res, 'Memory image is required.', 400);
    return;
  }

  const {
    groupId,
    memoryDate,
    caption,
    location,
  } = req.body;

  if (!groupId || !Types.ObjectId.isValid(groupId)) {
    sendError(res, 'Invalid Group ID format.', 422);
    return;
  }

  const groupObjectId = new Types.ObjectId(groupId);

  // 1. Authorize user is a member of the group
  const membership = await GroupMember.findOne({
    groupId: groupObjectId,
    userId: req.user._id,
  });

  if (!membership) {
    sendError(res, 'You are not a member of this group.', 403);
    return;
  }

  // 2. Pre-check: one memory per user per calendar day within group
  const existingMemory = await Memory.findOne({
    groupId: groupObjectId,
    userId: req.user._id,
    memoryDate,
  });

  if (existingMemory) {
    sendError(
      res,
      `You have already created a memory for ${memoryDate} in this group. Maximum 1 memory per day.`,
      409,
      {
        code: 'DUPLICATE_DAILY_MEMORY',
        existingId: existingMemory._id,
      }
    );
    return;
  }

  let cloudinaryPublicId: string | null = null;

  try {
    // 3. Upload the selected image to Cloudinary
    const uploadResult = await uploadImageToCloudinary(
      req.file.buffer,
      'campuscapsule/memories'
    );

    const imageUrl = uploadResult.imageUrl;
    cloudinaryPublicId = uploadResult.cloudinaryPublicId;

    // 4. Create memory document
    const memory = await Memory.create({
      groupId: groupObjectId,
      userId: req.user._id,
      imageUrl,
      cloudinaryPublicId,
      memoryDate,
      caption: caption || '',
      location:
        location || {
          latitude: null,
          longitude: null,
          readableName: '',
        },
    });

    // Populate creator info
    await memory.populate('userId', 'name email profileImage');

    sendCreated(res, memory, 'Memory preserved successfully');
  } catch (error) {
    // If Cloudinary upload succeeded but MongoDB creation failed,
    // remove the uploaded image so we don't leave an orphaned image.
    if (cloudinaryPublicId) {
      try {
        await deleteImageFromCloudinary(cloudinaryPublicId);
      } catch (cleanupError) {
        console.error(
          '[Cloudinary] Failed to clean up uploaded image:',
          cleanupError
        );
      }
    }

    console.error('[Memory] Failed to create memory:', error);

    sendError(
      res,
      'Unable to preserve memory. Please try again.',
      500
    );
  }
};

export const getGroupMemories = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const groupId = new Types.ObjectId(req.params.id);
  const {
    page = '1',
    limit = '20',
    memoryDate,
    year,
    month,
    userId,
  } = req.query;

  const pageNum = Math.max(
    1,
    parseInt(page as string, 10) || 1
  );

  const limitNum = Math.min(
    50,
    Math.max(1, parseInt(limit as string, 10) || 20)
  );

  const skip = (pageNum - 1) * limitNum;

  // Build filter query
  const query: any = { groupId };

  if (memoryDate) {
    query.memoryDate = memoryDate;
  } else if (month) {
    query.memoryDate = {
      $regex: `^${month}`,
    };
  } else if (year) {
    query.memoryDate = {
      $regex: `^${year}`,
    };
  }

  if (
    userId &&
    Types.ObjectId.isValid(userId as string)
  ) {
    query.userId = new Types.ObjectId(userId as string);
  }

  const [memories, total] = await Promise.all([
    Memory.find(query)
      .populate('userId', 'name email profileImage')
      .sort({
        memoryDate: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNum),

    Memory.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  sendSuccess(
    res,
    memories,
    'Memories retrieved successfully',
    200,
    {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasMore: pageNum < totalPages,
    }
  );
};

export const getMemoryById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const memory = await Memory.findById(
    req.params.id
  ).populate(
    'userId',
    'name email profileImage'
  );

  if (!memory) {
    sendError(res, 'Memory not found', 404);
    return;
  }

  // Ensure requester is a member of the memory's group
  const isMember = await GroupMember.exists({
    groupId: memory.groupId,
    userId: req.user?._id,
  });

  if (!isMember) {
    sendError(
      res,
      'Access denied. You are not a member of this group.',
      403
    );
    return;
  }

  sendSuccess(res, memory);
};

export const updateMemory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const memory = await Memory.findById(req.params.id);

  if (!memory) {
    sendError(res, 'Memory not found', 404);
    return;
  }

  const isOwner = req.user?._id.equals(memory.userId);

  const membership = await GroupMember.findOne({
    groupId: memory.groupId,
    userId: req.user?._id,
  });

  const isAdmin = membership?.role === 'admin';

  if (!isOwner && !isAdmin) {
    sendError(
      res,
      'Only the memory creator or a group admin can edit this memory.',
      403
    );
    return;
  }

  const { caption, location } = req.body;

  if (caption !== undefined) {
    memory.caption = caption;
  }

  if (location !== undefined) {
    memory.location = location;
  }

  await memory.save();

  await memory.populate(
    'userId',
    'name email profileImage'
  );

  sendSuccess(
    res,
    memory,
    'Memory updated successfully'
  );
};

export const deleteMemory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const memory = await Memory.findById(req.params.id);

  if (!memory) {
    sendError(res, 'Memory not found', 404);
    return;
  }

  const isOwner = req.user?._id.equals(memory.userId);

  const membership = await GroupMember.findOne({
    groupId: memory.groupId,
    userId: req.user?._id,
  });

  const isAdmin = membership?.role === 'admin';

  if (!isOwner && !isAdmin) {
    sendError(
      res,
      'Only the memory creator or a group admin can delete this memory.',
      403
    );
    return;
  }

  // Delete the image from Cloudinary before deleting the database record.
  try {
    if (memory.cloudinaryPublicId) {
      await deleteImageFromCloudinary(
        memory.cloudinaryPublicId
      );
    }
  } catch (error) {
    console.error(
      '[Cloudinary] Failed to delete memory image:',
      error
    );

    // We don't stop the memory deletion if Cloudinary cleanup fails.
  }

  await Memory.deleteOne({
    _id: memory._id,
  });

  sendSuccess(
    res,
    null,
    'Memory deleted successfully'
  );
};

export const getGroupCalendar = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const groupId = new Types.ObjectId(req.params.id);
  const { month } = req.query;

  const dateFilter = month
    ? {
        memoryDate: {
          $regex: `^${month}`,
        },
      }
    : {};

  const memories = await Memory.find({
    groupId,
    ...dateFilter,
  })
    .select('memoryDate userId imageUrl')
    .populate(
      'userId',
      'name profileImage'
    );

  // Group by date
  const calendarMap: Record<
    string,
    {
      date: string;
      count: number;
      memories: any[];
    }
  > = {};

  memories.forEach((mem) => {
    const d = mem.memoryDate;

    if (!calendarMap[d]) {
      calendarMap[d] = {
        date: d,
        count: 0,
        memories: [],
      };
    }

    calendarMap[d].count += 1;

    calendarMap[d].memories.push({
      id: mem._id,
      imageUrl: mem.imageUrl,
      user: mem.userId,
    });
  });

  sendSuccess(
    res,
    Object.values(calendarMap),
    'Calendar data retrieved'
  );
};

export const getGroupArchive = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const groupId = new Types.ObjectId(req.params.id);

  // Group by year and month
  const memories = await Memory.find({
    groupId,
  })
    .select('memoryDate imageUrl caption')
    .sort({
      memoryDate: -1,
    });

  const archiveTree: Record<
    string,
    Record<string, any[]>
  > = {};

  memories.forEach((mem) => {
    const [year, month] = mem.memoryDate.split('-');

    if (!archiveTree[year]) {
      archiveTree[year] = {};
    }

    if (!archiveTree[year][month]) {
      archiveTree[year][month] = [];
    }

    archiveTree[year][month].push({
      id: mem._id,
      date: mem.memoryDate,
      imageUrl: mem.imageUrl,
      caption: mem.caption,
    });
  });

  sendSuccess(
    res,
    archiveTree,
    'Archive timeline retrieved'
  );
};

