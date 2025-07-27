const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult, query } = require('express-validator');
const Media = require('../models/Media');
const Event = require('../models/Event');
const { 
  authenticateToken,
  requireEventOwnership,
  validateEventAccess,
  optionalAuth,
  userRateLimit 
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  uploadMultipleMedia,
  uploadSingleMedia,
  extractMetadata,
  generateImageVariants,
  deleteFile 
} = require('../utils/cloudinary');

const router = express.Router();

// Upload media files (for authenticated users - hosts/photographers)
router.post('/upload/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  uploadMultipleMedia(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const event = req.event;
    const uploadedMedia = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        const metadata = extractMetadata(file);
        
        // Generate image variants for images
        let quality = {};
        if (metadata.fileType === 'image') {
          quality = await generateImageVariants(metadata.cloudinaryPublicId);
        }

        const media = new Media({
          event: event._id,
          uploader: {
            type: req.user.role === 'photographer' ? 'photographer' : 'host',
            userId: req.user._id
          },
          ...metadata,
          quality,
          album: req.body.album || 'All Photos',
          caption: req.body.caption || '',
          tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
        });

        await media.save();
        uploadedMedia.push(media);

        // Emit real-time update
        const io = req.app.get('io');
        io.to(event._id.toString()).emit('new-media', {
          media: media,
          eventId: event._id
        });

      } catch (error) {
        console.error('Error processing file:', error);
        // Delete failed upload from Cloudinary
        if (file.filename) {
          await deleteFile(file.filename);
        }
      }
    }

    // Update event statistics
    await Event.findByIdAndUpdate(event._id, {
      $inc: {
        'statistics.totalPhotos': uploadedMedia.filter(m => m.fileType === 'image').length,
        'statistics.totalVideos': uploadedMedia.filter(m => m.fileType === 'video').length
      }
    });

    res.status(201).json({
      success: true,
      message: `${uploadedMedia.length} file(s) uploaded successfully`,
      data: { media: uploadedMedia }
    });
  });
}));

// Upload media files (for guests)
router.post('/guest-upload/:eventId', validateEventAccess, userRateLimit(20, 60 * 60 * 1000), asyncHandler(async (req, res) => {
  uploadMultipleMedia(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const event = req.event;
    const { guestName = 'Anonymous Guest', guestEmail } = req.body;
    
    if (!guestName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Guest name is required'
      });
    }

    const uploadedMedia = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        const metadata = extractMetadata(file);
        
        // Generate image variants for images
        let quality = {};
        if (metadata.fileType === 'image') {
          quality = await generateImageVariants(metadata.cloudinaryPublicId);
        }

        const media = new Media({
          event: event._id,
          uploader: {
            type: 'guest',
            guestName: guestName.trim(),
            guestEmail: guestEmail?.trim() || null
          },
          ...metadata,
          quality,
          album: req.body.album || 'All Photos',
          caption: req.body.caption || '',
          status: event.privacy.moderateUploads ? 'pending' : 'approved'
        });

        await media.save();
        
        if (media.status === 'approved') {
          uploadedMedia.push(media);

          // Emit real-time update only for approved media
          const io = req.app.get('io');
          io.to(event._id.toString()).emit('new-media', {
            media: media,
            eventId: event._id
          });
        }

      } catch (error) {
        console.error('Error processing file:', error);
        // Delete failed upload from Cloudinary
        if (file.filename) {
          await deleteFile(file.filename);
        }
      }
    }

    // Update event statistics for approved media
    if (uploadedMedia.length > 0) {
      await Event.findByIdAndUpdate(event._id, {
        $inc: {
          'statistics.totalPhotos': uploadedMedia.filter(m => m.fileType === 'image').length,
          'statistics.totalVideos': uploadedMedia.filter(m => m.fileType === 'video').length
        }
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploadedMedia.length} file(s) uploaded successfully${event.privacy.moderateUploads ? ' and pending approval' : ''}`,
      data: { media: uploadedMedia }
    });
  });
}));

// Get media for an event (public access)
router.get('/event/:eventId', validateEventAccess, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    album, 
    fileType, 
    sort = 'createdAt', 
    order = 'desc',
    featured
  } = req.query;

  const query = {
    event: req.params.eventId,
    status: 'approved',
    isHidden: false
  };

  // Filter by album
  if (album && album !== 'All Photos') {
    query.album = album;
  }

  // Filter by file type
  if (fileType) {
    query.fileType = fileType;
  }

  // Filter featured media
  if (featured === 'true') {
    query.isFeatured = true;
  }

  const sortOrder = order === 'desc' ? -1 : 1;
  const sortOptions = {};
  sortOptions[sort] = sortOrder;

  const media = await Media.find(query)
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .select('-cloudinaryPublicId -processingStatus');

  const total = await Media.countDocuments(query);

  res.json({
    success: true,
    data: {
      media,
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

// Get media for management (authenticated users)
router.get('/manage/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    album, 
    fileType, 
    status, 
    sort = 'createdAt', 
    order = 'desc',
    search
  } = req.query;

  const query = { event: req.params.eventId };

  // Filter by album
  if (album && album !== 'All Photos') {
    query.album = album;
  }

  // Filter by file type
  if (fileType) {
    query.fileType = fileType;
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Search filter
  if (search) {
    query.$or = [
      { originalName: { $regex: search, $options: 'i' } },
      { caption: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
      { 'uploader.guestName': { $regex: search, $options: 'i' } }
    ];
  }

  const sortOrder = order === 'desc' ? -1 : 1;
  const sortOptions = {};
  sortOptions[sort] = sortOrder;

  const media = await Media.find(query)
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Media.countDocuments(query);

  // Get status counts
  const statusCounts = await Media.aggregate([
    { $match: { event: mongoose.Types.ObjectId(req.params.eventId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  res.json({
    success: true,
    data: {
      media,
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

// Get single media item
router.get('/:mediaId', optionalAuth, asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.mediaId)
    .populate('event', 'title coupleNames privacy settings');

  if (!media) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }

  // Check if user has access to this media
  const event = media.event;
  const isOwner = req.user && (
    event.host.toString() === req.user._id.toString() ||
    event.photographers.includes(req.user._id)
  );

  // If media is not approved and user is not owner, deny access
  if (media.status !== 'approved' && !isOwner) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }

  // Increment view count
  await media.incrementViews();

  res.json({
    success: true,
    data: { media }
  });
}));

// Update media (authenticated users only)
router.put('/:mediaId', authenticateToken, asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.mediaId).populate('event');

  if (!media) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }

  // Check permissions
  const event = media.event;
  const isOwner = event.host.toString() === req.user._id.toString() ||
                  event.photographers.includes(req.user._id);

  if (!isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied'
    });
  }

  const { caption, album, tags, status, isFeatured, isHidden } = req.body;
  const updateData = {};

  if (caption !== undefined) updateData.caption = caption;
  if (album) updateData.album = album;
  if (tags) updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
  if (status) updateData.status = status;
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
  if (isHidden !== undefined) updateData.isHidden = isHidden;

  const updatedMedia = await Media.findByIdAndUpdate(
    req.params.mediaId,
    updateData,
    { new: true }
  );

  // Emit real-time update if status changed to approved
  if (status === 'approved' && media.status !== 'approved') {
    const io = req.app.get('io');
    io.to(event._id.toString()).emit('media-approved', {
      media: updatedMedia,
      eventId: event._id
    });
  }

  res.json({
    success: true,
    message: 'Media updated successfully',
    data: { media: updatedMedia }
  });
}));

// Delete media
router.delete('/:mediaId', authenticateToken, asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.mediaId).populate('event');

  if (!media) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }

  // Check permissions
  const event = media.event;
  const isOwner = event.host.toString() === req.user._id.toString() ||
                  event.photographers.includes(req.user._id);

  if (!isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied'
    });
  }

  // Delete from Cloudinary
  try {
    await deleteFile(media.cloudinaryPublicId, media.fileType === 'video' ? 'video' : 'image');
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }

  // Delete from database
  await Media.findByIdAndDelete(req.params.mediaId);

  // Update event statistics
  const updateObj = {};
  if (media.fileType === 'image') {
    updateObj['statistics.totalPhotos'] = -1;
  } else if (media.fileType === 'video') {
    updateObj['statistics.totalVideos'] = -1;
  }

  await Event.findByIdAndUpdate(event._id, { $inc: updateObj });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(event._id.toString()).emit('media-deleted', {
    mediaId: media._id,
    eventId: event._id
  });

  res.json({
    success: true,
    message: 'Media deleted successfully'
  });
}));

// Like media
router.post('/:mediaId/like', validateEventAccess, userRateLimit(50, 60 * 60 * 1000), asyncHandler(async (req, res) => {
  const { guestName } = req.body;

  if (!guestName || !guestName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Guest name is required'
    });
  }

  const media = await Media.findById(req.params.mediaId);

  if (!media) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }

  if (media.event.toString() !== req.event._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Media does not belong to this event'
    });
  }

  await media.addLike(guestName.trim());

  // Emit real-time update
  const io = req.app.get('io');
  io.to(req.event._id.toString()).emit('media-liked', {
    mediaId: media._id,
    likeCount: media.likeCount + 1,
    guestName: guestName.trim()
  });

  res.json({
    success: true,
    message: 'Media liked successfully',
    data: { likeCount: media.likeCount + 1 }
  });
}));

// Unlike media
router.delete('/:mediaId/like', validateEventAccess, asyncHandler(async (req, res) => {
  const { guestName } = req.body;

  if (!guestName || !guestName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Guest name is required'
    });
  }

  const media = await Media.findById(req.params.mediaId);

  if (!media) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }

  await media.removeLike(guestName.trim());

  res.json({
    success: true,
    message: 'Like removed successfully',
    data: { likeCount: media.likeCount - 1 }
  });
}));

// Add comment to media
router.post('/:mediaId/comments', validateEventAccess, userRateLimit(30, 60 * 60 * 1000), 
[
  body('guestName').trim().isLength({ min: 1 }).withMessage('Guest name is required'),
  body('message').trim().isLength({ min: 1, max: 300 }).withMessage('Comment must be 1-300 characters')
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
  const media = await Media.findById(req.params.mediaId);

  if (!media) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }

  if (media.event.toString() !== req.event._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Media does not belong to this event'
    });
  }

  const needsApproval = req.event.privacy.moderateUploads;
  await media.addComment(guestName.trim(), message.trim(), needsApproval);

  // Emit real-time update if comment is approved
  if (!needsApproval) {
    const io = req.app.get('io');
    io.to(req.event._id.toString()).emit('new-comment', {
      mediaId: media._id,
      comment: {
        guestName: guestName.trim(),
        message: message.trim(),
        timestamp: new Date()
      }
    });
  }

  res.json({
    success: true,
    message: needsApproval ? 'Comment submitted for approval' : 'Comment added successfully'
  });
}));

// Bulk approve/reject media
router.patch('/bulk-action/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { mediaIds, action } = req.body;

  if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Media IDs array is required'
    });
  }

  if (!['approve', 'reject', 'delete', 'feature', 'unfeature'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid action'
    });
  }

  const updateData = {};
  if (action === 'approve') updateData.status = 'approved';
  if (action === 'reject') updateData.status = 'rejected';
  if (action === 'feature') updateData.isFeatured = true;
  if (action === 'unfeature') updateData.isFeatured = false;

  if (action === 'delete') {
    // Get media items to delete from Cloudinary
    const mediaToDelete = await Media.find({
      _id: { $in: mediaIds },
      event: req.params.eventId
    });

    // Delete from Cloudinary
    for (const media of mediaToDelete) {
      try {
        await deleteFile(media.cloudinaryPublicId, media.fileType === 'video' ? 'video' : 'image');
      } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
      }
    }

    // Delete from database
    await Media.deleteMany({
      _id: { $in: mediaIds },
      event: req.params.eventId
    });
  } else {
    await Media.updateMany(
      {
        _id: { $in: mediaIds },
        event: req.params.eventId
      },
      updateData
    );
  }

  res.json({
    success: true,
    message: `${mediaIds.length} media items ${action}${action.endsWith('e') ? 'd' : 'ed'} successfully`
  });
}));

// Download media
router.get('/:mediaId/download', optionalAuth, asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.mediaId).populate('event');

  if (!media) {
    return res.status(404).json({
      success: false,
      message: 'Media not found'
    });
  }

  // Check if downloads are allowed
  if (!media.event.privacy.allowDownloads) {
    return res.status(403).json({
      success: false,
      message: 'Downloads are not allowed for this event'
    });
  }

  // Increment download count
  await media.incrementDownloads();

  // Return the download URL
  res.json({
    success: true,
    data: {
      downloadUrl: media.url,
      filename: media.originalName
    }
  });
}));

module.exports = router;