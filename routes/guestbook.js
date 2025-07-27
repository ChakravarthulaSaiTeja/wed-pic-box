const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Guestbook = require('../models/Guestbook');
const Event = require('../models/Event');
const { 
  authenticateToken,
  requireEventOwnership,
  validateEventAccess,
  userRateLimit 
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadSingleAudio, extractMetadata, deleteFile } = require('../utils/cloudinary');

const router = express.Router();

// Validation for guestbook entries
const guestbookValidation = [
  body('guestName').trim().isLength({ min: 1, max: 100 }).withMessage('Guest name is required (1-100 characters)'),
  body('textMessage').optional().trim().isLength({ max: 1000 }).withMessage('Message too long (max 1000 characters)'),
  body('guestEmail').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email')
];

// Create new guestbook entry (text)
router.post('/:eventId', validateEventAccess, userRateLimit(10, 60 * 60 * 1000), guestbookValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { guestName, textMessage, guestEmail } = req.body;
  const event = req.event;

  if (!event.settings.enableGuestbook) {
    return res.status(403).json({
      success: false,
      message: 'Guestbook is disabled for this event'
    });
  }

  if (!textMessage || !textMessage.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Message is required'
    });
  }

  const guestbookEntry = new Guestbook({
    event: event._id,
    guestName: guestName.trim(),
    guestEmail: guestEmail?.trim() || null,
    messageType: 'text',
    textMessage: textMessage.trim(),
    status: event.privacy.moderateUploads ? 'pending' : 'approved',
    metadata: {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
    }
  });

  await guestbookEntry.save();

  // Update event statistics
  if (guestbookEntry.status === 'approved') {
    await Event.findByIdAndUpdate(event._id, {
      $inc: { 'statistics.totalGuestbookEntries': 1 }
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(event._id.toString()).emit('new-guestbook-entry', {
      entry: guestbookEntry,
      eventId: event._id
    });
  }

  res.status(201).json({
    success: true,
    message: guestbookEntry.status === 'approved' ? 'Message added successfully' : 'Message submitted for approval',
    data: { entry: guestbookEntry }
  });
}));

// Create audio guestbook entry
router.post('/:eventId/audio', validateEventAccess, userRateLimit(5, 60 * 60 * 1000), asyncHandler(async (req, res) => {
  const event = req.event;

  if (!event.settings.enableGuestbook || !event.settings.enableAudioMessages) {
    return res.status(403).json({
      success: false,
      message: 'Audio messages are disabled for this event'
    });
  }

  uploadSingleAudio(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file uploaded'
      });
    }

    const { guestName, textMessage, guestEmail } = req.body;

    if (!guestName || !guestName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Guest name is required'
      });
    }

    const metadata = extractMetadata(req.file);

    const guestbookEntry = new Guestbook({
      event: event._id,
      guestName: guestName.trim(),
      guestEmail: guestEmail?.trim() || null,
      messageType: textMessage?.trim() ? 'mixed' : 'audio',
      textMessage: textMessage?.trim() || null,
      audioMessage: {
        url: req.file.path,
        duration: metadata.duration,
        cloudinaryPublicId: metadata.cloudinaryPublicId
      },
      status: event.privacy.moderateUploads ? 'pending' : 'approved',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
      }
    });

    await guestbookEntry.save();

    // Update event statistics
    if (guestbookEntry.status === 'approved') {
      await Event.findByIdAndUpdate(event._id, {
        $inc: { 'statistics.totalGuestbookEntries': 1 }
      });

      // Emit real-time update
      const io = req.app.get('io');
      io.to(event._id.toString()).emit('new-guestbook-entry', {
        entry: guestbookEntry,
        eventId: event._id
      });
    }

    res.status(201).json({
      success: true,
      message: guestbookEntry.status === 'approved' ? 'Audio message added successfully' : 'Audio message submitted for approval',
      data: { entry: guestbookEntry }
    });
  });
}));

// Get guestbook entries for an event (public)
router.get('/:eventId', validateEventAccess, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
  const event = req.event;

  if (!event.settings.enableGuestbook) {
    return res.status(403).json({
      success: false,
      message: 'Guestbook is disabled for this event'
    });
  }

  const query = {
    event: event._id,
    status: 'approved',
    isHidden: false
  };

  const sortOrder = order === 'desc' ? -1 : 1;
  const sortOptions = {};
  
  // Handle special sorting for pinned entries
  if (sort === 'pinned') {
    sortOptions.isPinned = -1;
    sortOptions.createdAt = -1;
  } else {
    sortOptions[sort] = sortOrder;
  }

  const entries = await Guestbook.find(query)
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .select('-metadata');

  const total = await Guestbook.countDocuments(query);

  res.json({
    success: true,
    data: {
      entries,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    }
  });
}));

// Get guestbook entries for management (authenticated users)
router.get('/manage/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    messageType,
    sort = 'createdAt', 
    order = 'desc',
    search
  } = req.query;

  const query = { event: req.params.eventId };

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by message type
  if (messageType) {
    query.messageType = messageType;
  }

  // Search filter
  if (search) {
    query.$or = [
      { guestName: { $regex: search, $options: 'i' } },
      { textMessage: { $regex: search, $options: 'i' } },
      { guestEmail: { $regex: search, $options: 'i' } }
    ];
  }

  const sortOrder = order === 'desc' ? -1 : 1;
  const sortOptions = {};
  
  if (sort === 'pinned') {
    sortOptions.isPinned = -1;
    sortOptions.createdAt = -1;
  } else {
    sortOptions[sort] = sortOrder;
  }

  const entries = await Guestbook.find(query)
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Guestbook.countDocuments(query);

  // Get status counts
  const statusCounts = await Guestbook.aggregate([
    { $match: { event: mongoose.Types.ObjectId(req.params.eventId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  res.json({
    success: true,
    data: {
      entries,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    }
  });
}));

// Get single guestbook entry
router.get('/entry/:entryId', asyncHandler(async (req, res) => {
  const entry = await Guestbook.findById(req.params.entryId)
    .populate('event', 'title coupleNames settings privacy');

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Guestbook entry not found'
    });
  }

  res.json({
    success: true,
    data: { entry }
  });
}));

// Update guestbook entry (authenticated users only)
router.put('/entry/:entryId', authenticateToken, asyncHandler(async (req, res) => {
  const entry = await Guestbook.findById(req.params.entryId).populate('event');

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Guestbook entry not found'
    });
  }

  // Check permissions
  const event = entry.event;
  const isOwner = event.host.toString() === req.user._id.toString() ||
                  event.photographers.includes(req.user._id);

  if (!isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied'
    });
  }

  const { status, isPinned, isHidden } = req.body;
  const updateData = {};

  if (status) updateData.status = status;
  if (isPinned !== undefined) updateData.isPinned = isPinned;
  if (isHidden !== undefined) updateData.isHidden = isHidden;

  const updatedEntry = await Guestbook.findByIdAndUpdate(
    req.params.entryId,
    updateData,
    { new: true }
  );

  // Emit real-time update if status changed to approved
  if (status === 'approved' && entry.status !== 'approved') {
    const io = req.app.get('io');
    io.to(event._id.toString()).emit('guestbook-approved', {
      entry: updatedEntry,
      eventId: event._id
    });
  }

  res.json({
    success: true,
    message: 'Guestbook entry updated successfully',
    data: { entry: updatedEntry }
  });
}));

// Delete guestbook entry
router.delete('/entry/:entryId', authenticateToken, asyncHandler(async (req, res) => {
  const entry = await Guestbook.findById(req.params.entryId).populate('event');

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Guestbook entry not found'
    });
  }

  // Check permissions
  const event = entry.event;
  const isOwner = event.host.toString() === req.user._id.toString() ||
                  event.photographers.includes(req.user._id);

  if (!isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied'
    });
  }

  // Delete audio file from Cloudinary if exists
  if (entry.audioMessage.cloudinaryPublicId) {
    try {
      await deleteFile(entry.audioMessage.cloudinaryPublicId, 'raw');
    } catch (error) {
      console.error('Error deleting audio from Cloudinary:', error);
    }
  }

  await Guestbook.findByIdAndDelete(req.params.entryId);

  // Update event statistics
  await Event.findByIdAndUpdate(event._id, {
    $inc: { 'statistics.totalGuestbookEntries': -1 }
  });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(event._id.toString()).emit('guestbook-deleted', {
    entryId: entry._id,
    eventId: event._id
  });

  res.json({
    success: true,
    message: 'Guestbook entry deleted successfully'
  });
}));

// Like guestbook entry
router.post('/entry/:entryId/like', validateEventAccess, userRateLimit(50, 60 * 60 * 1000), asyncHandler(async (req, res) => {
  const { guestName } = req.body;

  if (!guestName || !guestName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Guest name is required'
    });
  }

  const entry = await Guestbook.findById(req.params.entryId);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Guestbook entry not found'
    });
  }

  if (entry.event.toString() !== req.event._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Entry does not belong to this event'
    });
  }

  await entry.addLike(guestName.trim());

  // Emit real-time update
  const io = req.app.get('io');
  io.to(req.event._id.toString()).emit('guestbook-liked', {
    entryId: entry._id,
    likeCount: entry.likeCount + 1,
    guestName: guestName.trim()
  });

  res.json({
    success: true,
    message: 'Entry liked successfully',
    data: { likeCount: entry.likeCount + 1 }
  });
}));

// Unlike guestbook entry
router.delete('/entry/:entryId/like', validateEventAccess, asyncHandler(async (req, res) => {
  const { guestName } = req.body;

  if (!guestName || !guestName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Guest name is required'
    });
  }

  const entry = await Guestbook.findById(req.params.entryId);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Guestbook entry not found'
    });
  }

  await entry.removeLike(guestName.trim());

  res.json({
    success: true,
    message: 'Like removed successfully',
    data: { likeCount: entry.likeCount - 1 }
  });
}));

// Add reply to guestbook entry
router.post('/entry/:entryId/replies', validateEventAccess, userRateLimit(20, 60 * 60 * 1000),
[
  body('guestName').trim().isLength({ min: 1 }).withMessage('Guest name is required'),
  body('message').trim().isLength({ min: 1, max: 300 }).withMessage('Reply must be 1-300 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { guestName, message } = req.body;
  const entry = await Guestbook.findById(req.params.entryId);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Guestbook entry not found'
    });
  }

  if (entry.event.toString() !== req.event._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Entry does not belong to this event'
    });
  }

  const needsApproval = req.event.privacy.moderateUploads;
  await entry.addReply(guestName.trim(), message.trim(), needsApproval);

  // Emit real-time update if reply is approved
  if (!needsApproval) {
    const io = req.app.get('io');
    io.to(req.event._id.toString()).emit('new-guestbook-reply', {
      entryId: entry._id,
      reply: {
        guestName: guestName.trim(),
        message: message.trim(),
        timestamp: new Date()
      }
    });
  }

  res.json({
    success: true,
    message: needsApproval ? 'Reply submitted for approval' : 'Reply added successfully'
  });
}));

// Bulk approve/reject guestbook entries
router.patch('/bulk-action/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { entryIds, action } = req.body;

  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Entry IDs array is required'
    });
  }

  if (!['approve', 'reject', 'delete', 'pin', 'unpin'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid action'
    });
  }

  const updateData = {};
  if (action === 'approve') updateData.status = 'approved';
  if (action === 'reject') updateData.status = 'rejected';
  if (action === 'pin') updateData.isPinned = true;
  if (action === 'unpin') updateData.isPinned = false;

  if (action === 'delete') {
    // Get entries to delete audio files from Cloudinary
    const entriesToDelete = await Guestbook.find({
      _id: { $in: entryIds },
      event: req.params.eventId
    });

    // Delete audio files from Cloudinary
    for (const entry of entriesToDelete) {
      if (entry.audioMessage.cloudinaryPublicId) {
        try {
          await deleteFile(entry.audioMessage.cloudinaryPublicId, 'raw');
        } catch (error) {
          console.error('Error deleting audio from Cloudinary:', error);
        }
      }
    }

    // Delete from database
    await Guestbook.deleteMany({
      _id: { $in: entryIds },
      event: req.params.eventId
    });

    // Update event statistics
    await Event.findByIdAndUpdate(req.params.eventId, {
      $inc: { 'statistics.totalGuestbookEntries': -entriesToDelete.length }
    });
  } else {
    await Guestbook.updateMany(
      {
        _id: { $in: entryIds },
        event: req.params.eventId
      },
      updateData
    );
  }

  res.json({
    success: true,
    message: `${entryIds.length} guestbook entries ${action}${action.endsWith('e') ? 'd' : 'ed'} successfully`
  });
}));

module.exports = router;