const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { 
  generateToken, 
  generateRefreshToken, 
  authenticateToken,
  userRateLimit 
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadSingleProfile, extractMetadata } = require('../utils/cloudinary');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').optional().isIn(['host', 'photographer']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
];

// Register new user
router.post('/register', userRateLimit(5, 15 * 60 * 1000), registerValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password, firstName, lastName, role = 'host' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Create new user
  const user = new User({
    email,
    password,
    firstName,
    lastName,
    role
  });

  await user.save();

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token,
      refreshToken
    }
  });
}));

// Login user
router.post('/login', userRateLimit(10, 15 * 60 * 1000), loginValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Remove password from response
  user.password = undefined;

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token,
      refreshToken
    }
  });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('events', 'title eventDate isActive');
  
  res.json({
    success: true,
    data: { user }
  });
}));

// Update user profile
router.put('/profile', authenticateToken, updateProfileValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { firstName, lastName, email, preferences } = req.body;
  const userId = req.user._id;

  // Check if email is already taken by another user
  if (email && email !== req.user.email) {
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use by another account'
      });
    }
  }

  const updateData = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (email) updateData.email = email;
  if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
}));

// Upload profile photo
router.post('/profile/photo', authenticateToken, asyncHandler(async (req, res) => {
  uploadSingleProfile(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file uploaded'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: req.file.path },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: { 
        user,
        photoUrl: req.file.path
      }
    });
  });
}));

// Change password
router.put('/password', authenticateToken, changePasswordValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token required'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
}));

// Logout (client-side token removal, optionally blacklist token)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a production app, you might want to blacklist the token
  // For now, we'll just return success as the client will remove the token
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Deactivate account
router.delete('/account', authenticateToken, asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password confirmation required'
    });
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid password'
    });
  }

  // Deactivate account instead of deleting
  user.isActive = false;
  await user.save();

  res.json({
    success: true,
    message: 'Account deactivated successfully'
  });
}));

// Get user statistics (for dashboard)
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const Event = require('../models/Event');
  const Media = require('../models/Media');
  const Guestbook = require('../models/Guestbook');

  const userId = req.user._id;

  // Get user's events
  const events = await Event.find({ 
    $or: [
      { host: userId },
      { photographers: userId }
    ]
  });

  const eventIds = events.map(event => event._id);

  // Get statistics
  const [totalEvents, totalMedia, totalGuestbookEntries] = await Promise.all([
    Event.countDocuments({ 
      $or: [
        { host: userId },
        { photographers: userId }
      ]
    }),
    Media.countDocuments({ event: { $in: eventIds } }),
    Guestbook.countDocuments({ event: { $in: eventIds } })
  ]);

  // Get recent activity
  const recentMedia = await Media.find({ event: { $in: eventIds } })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('event', 'title coupleNames');

  const recentGuestbook = await Guestbook.find({ event: { $in: eventIds } })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('event', 'title coupleNames');

  res.json({
    success: true,
    data: {
      statistics: {
        totalEvents,
        totalMedia,
        totalGuestbookEntries,
        activeEvents: events.filter(e => e.isActive && e.isPublished).length
      },
      recentActivity: {
        media: recentMedia,
        guestbook: recentGuestbook
      },
      events: events.slice(0, 5) // Recent events
    }
  });
}));

module.exports = router;