const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult, query } = require('express-validator');
const Event = require('../models/Event');
const Media = require('../models/Media');
const Guestbook = require('../models/Guestbook');
const { 
  authenticateToken,
  requireEventOwnership,
  validateEventAccess,
  optionalAuth,
  userRateLimit 
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadSingleCover, extractMetadata } = require('../utils/cloudinary');

const router = express.Router();

// Validation rules
const createEventValidation = [
  body('title').trim().isLength({ min: 1 }).withMessage('Event title is required'),
  body('coupleNames.partner1').trim().isLength({ min: 1 }).withMessage('Partner 1 name is required'),
  body('coupleNames.partner2').trim().isLength({ min: 1 }).withMessage('Partner 2 name is required'),
  body('eventDate').isISO8601().withMessage('Valid event date is required'),
  body('venue.name').optional().trim(),
  body('venue.address').optional().trim(),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long')
];

const updateEventValidation = [
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Event title cannot be empty'),
  body('coupleNames.partner1').optional().trim().isLength({ min: 1 }).withMessage('Partner 1 name cannot be empty'),
  body('coupleNames.partner2').optional().trim().isLength({ min: 1 }).withMessage('Partner 2 name cannot be empty'),
  body('eventDate').optional().isISO8601().withMessage('Valid event date is required'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long')
];

// Create new event
router.post('/', authenticateToken, createEventValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const eventData = {
    ...req.body,
    host: req.user._id
  };

  const event = new Event(eventData);
  await event.save();

  // Add event to user's events array
  req.user.events.push(event._id);
  await req.user.save();

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: { event }
  });
}));

// Get user's events (host and photographer)
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const userId = req.user._id;

  const query = {
    $or: [
      { host: userId },
      { photographers: userId }
    ]
  };

  // Filter by status
  if (status) {
    if (status === 'active') {
      query.isActive = true;
      query.isPublished = true;
    } else if (status === 'draft') {
      query.isPublished = false;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
  }

  // Search filter
  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { 'coupleNames.partner1': { $regex: search, $options: 'i' } },
        { 'coupleNames.partner2': { $regex: search, $options: 'i' } },
        { 'venue.name': { $regex: search, $options: 'i' } }
      ]
    });
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { eventDate: -1 },
    populate: [
      { path: 'host', select: 'firstName lastName email' },
      { path: 'photographers', select: 'firstName lastName email' }
    ]
  };

  const events = await Event.find(query)
    .populate(options.populate)
    .sort(options.sort)
    .limit(options.limit * options.page)
    .skip((options.page - 1) * options.limit);
  
  const total = await Event.countDocuments(query);
  
  const paginatedResult = {
    docs: events,
    totalDocs: total,
    limit: options.limit,
    page: options.page,
    totalPages: Math.ceil(total / options.limit),
    hasNextPage: options.page < Math.ceil(total / options.limit),
    hasPrevPage: options.page > 1
  };

  res.json({
    success: true,
    data: paginatedResult
  });
}));

// Get single event (authenticated users)
router.get('/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId)
    .populate('host', 'firstName lastName email profilePhoto')
    .populate('photographers', 'firstName lastName email profilePhoto');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  res.json({
    success: true,
    data: { event }
  });
}));

// Get public event (for guests)
router.get('/public/:eventId', validateEventAccess, asyncHandler(async (req, res) => {
  const event = req.event;

  // Return limited event data for guests
  const publicEventData = {
    _id: event._id,
    title: event.title,
    description: event.description,
    coupleNames: event.coupleNames,
    eventDate: event.eventDate,
    venue: event.venue,
    coverPhoto: event.coverPhoto,
    theme: event.theme,
    settings: {
      enableSlideshow: event.settings.enableSlideshow,
      slideshowInterval: event.settings.slideshowInterval,
      enableGuestbook: event.settings.enableGuestbook,
      enableAudioMessages: event.settings.enableAudioMessages
    },
    privacy: {
      allowComments: event.privacy.allowComments,
      allowLikes: event.privacy.allowLikes,
      allowDownloads: event.privacy.allowDownloads
    }
  };

  res.json({
    success: true,
    data: { event: publicEventData }
  });
}));

// Update event
router.put('/:eventId', authenticateToken, requireEventOwnership, updateEventValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const event = await Event.findByIdAndUpdate(
    req.params.eventId,
    req.body,
    { new: true, runValidators: true }
  ).populate('host', 'firstName lastName email')
   .populate('photographers', 'firstName lastName email');

  res.json({
    success: true,
    message: 'Event updated successfully',
    data: { event }
  });
}));

// Upload cover photo
router.post('/:eventId/cover', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  uploadSingleCover(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No cover photo uploaded'
      });
    }

    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      { coverPhoto: req.file.path },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Cover photo updated successfully',
      data: { 
        event,
        coverPhotoUrl: req.file.path
      }
    });
  });
}));

// Manage albums
router.post('/:eventId/albums', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Album name is required'
    });
  }

  const event = await Event.findById(req.params.eventId);
  
  // Check if album name already exists
  const existingAlbum = event.albums.find(album => album.name.toLowerCase() === name.toLowerCase());
  if (existingAlbum) {
    return res.status(400).json({
      success: false,
      message: 'Album with this name already exists'
    });
  }

  const newAlbum = {
    name: name.trim(),
    description: description?.trim() || '',
    order: event.albums.length
  };

  event.albums.push(newAlbum);
  await event.save();

  res.json({
    success: true,
    message: 'Album created successfully',
    data: { album: newAlbum }
  });
}));

// Update album
router.put('/:eventId/albums/:albumId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { name, description, order } = req.body;
  const event = await Event.findById(req.params.eventId);
  
  const album = event.albums.id(req.params.albumId);
  if (!album) {
    return res.status(404).json({
      success: false,
      message: 'Album not found'
    });
  }

  if (name) album.name = name.trim();
  if (description !== undefined) album.description = description.trim();
  if (order !== undefined) album.order = order;

  await event.save();

  res.json({
    success: true,
    message: 'Album updated successfully',
    data: { album }
  });
}));

// Delete album
router.delete('/:eventId/albums/:albumId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  
  const album = event.albums.id(req.params.albumId);
  if (!album) {
    return res.status(404).json({
      success: false,
      message: 'Album not found'
    });
  }

  if (album.isDefault) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete default album'
    });
  }

  // Move all media from this album to default album
  await Media.updateMany(
    { event: req.params.eventId, album: album.name },
    { album: 'All Photos' }
  );

  album.remove();
  await event.save();

  res.json({
    success: true,
    message: 'Album deleted successfully'
  });
}));

// Get event statistics
router.get('/:eventId/stats', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;

  const [
    totalPhotos,
    totalVideos,
    totalGuestbookEntries,
    totalLikes,
    totalComments,
    recentActivity
  ] = await Promise.all([
    Media.countDocuments({ event: eventId, fileType: 'image' }),
    Media.countDocuments({ event: eventId, fileType: 'video' }),
    Guestbook.countDocuments({ event: eventId }),
    Media.aggregate([
      { $match: { event: mongoose.Types.ObjectId(eventId) } },
      { $project: { likeCount: { $size: '$interactions.likes' } } },
      { $group: { _id: null, total: { $sum: '$likeCount' } } }
    ]),
    Media.aggregate([
      { $match: { event: mongoose.Types.ObjectId(eventId) } },
      { $project: { commentCount: { $size: '$interactions.comments' } } },
      { $group: { _id: null, total: { $sum: '$commentCount' } } }
    ]),
    Media.find({ event: eventId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('originalName fileType createdAt uploader')
  ]);

  // Update event statistics
  await Event.findByIdAndUpdate(eventId, {
    'statistics.totalPhotos': totalPhotos,
    'statistics.totalVideos': totalVideos,
    'statistics.totalGuestbookEntries': totalGuestbookEntries,
    'statistics.totalLikes': totalLikes[0]?.total || 0,
    'statistics.totalComments': totalComments[0]?.total || 0
  });

  res.json({
    success: true,
    data: {
      statistics: {
        totalPhotos,
        totalVideos,
        totalGuestbookEntries,
        totalLikes: totalLikes[0]?.total || 0,
        totalComments: totalComments[0]?.total || 0,
        totalMedia: totalPhotos + totalVideos
      },
      recentActivity
    }
  });
}));

// Publish/unpublish event
router.patch('/:eventId/publish', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { isPublished } = req.body;

  const event = await Event.findByIdAndUpdate(
    req.params.eventId,
    { isPublished: Boolean(isPublished) },
    { new: true }
  );

  res.json({
    success: true,
    message: `Event ${isPublished ? 'published' : 'unpublished'} successfully`,
    data: { event }
  });
}));

// Delete event
router.delete('/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;

  // Delete all associated media and guestbook entries
  await Promise.all([
    Media.deleteMany({ event: eventId }),
    Guestbook.deleteMany({ event: eventId })
  ]);

  // Remove event from user's events array
  await User.updateMany(
    { events: eventId },
    { $pull: { events: eventId } }
  );

  // Delete the event
  await Event.findByIdAndDelete(eventId);

  res.json({
    success: true,
    message: 'Event deleted successfully'
  });
}));

// Add photographer to event
router.post('/:eventId/photographers', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Photographer email is required'
    });
  }

  const User = require('../models/User');
  const photographer = await User.findOne({ email, role: 'photographer', isActive: true });

  if (!photographer) {
    return res.status(404).json({
      success: false,
      message: 'Photographer not found or not active'
    });
  }

  const event = await Event.findById(req.params.eventId);

  if (event.photographers.includes(photographer._id)) {
    return res.status(400).json({
      success: false,
      message: 'Photographer already added to this event'
    });
  }

  event.photographers.push(photographer._id);
  await event.save();

  // Add event to photographer's events
  photographer.events.push(event._id);
  await photographer.save();

  await event.populate('photographers', 'firstName lastName email');

  res.json({
    success: true,
    message: 'Photographer added successfully',
    data: { photographers: event.photographers }
  });
}));

// Remove photographer from event
router.delete('/:eventId/photographers/:photographerId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  const photographerId = req.params.photographerId;

  if (!event.photographers.includes(photographerId)) {
    return res.status(404).json({
      success: false,
      message: 'Photographer not found in this event'
    });
  }

  event.photographers = event.photographers.filter(id => id.toString() !== photographerId);
  await event.save();

  // Remove event from photographer's events
  const User = require('../models/User');
  await User.findByIdAndUpdate(
    photographerId,
    { $pull: { events: event._id } }
  );

  res.json({
    success: true,
    message: 'Photographer removed successfully'
  });
}));

module.exports = router;