const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive user' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Middleware to check if user owns the event or is admin
const requireEventOwnership = async (req, res, next) => {
  try {
    const Event = require('../models/Event');
    const eventId = req.params.eventId || req.body.eventId;
    
    if (!eventId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event ID required' 
      });
    }

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    // Check if user is the host, photographer, or admin
    const isHost = event.host.toString() === req.user._id.toString();
    const isPhotographer = event.photographers.some(p => p.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isPhotographer && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this event' 
      });
    }

    req.event = event;
    next();
  } catch (error) {
    console.error('Event ownership middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking event ownership' 
    });
  }
};

// Middleware for optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Middleware to rate limit by user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const identifier = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    
    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }
    
    const userRequests = requests.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    next();
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    { expiresIn: '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' }, 
    process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    { expiresIn: '30d' }
  );
};

// Validate guest access to event (with optional password)
const validateEventAccess = async (req, res, next) => {
  try {
    const Event = require('../models/Event');
    const eventId = req.params.eventId;
    
    const event = await Event.findById(eventId);
    
    if (!event || !event.isActive || !event.isPublished) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found or not available' 
      });
    }

    // Check if event requires password
    if (event.privacy.isPasswordProtected) {
      const providedPassword = req.headers['x-event-password'] || req.body.eventPassword;
      
      if (!providedPassword || providedPassword !== event.privacy.password) {
        return res.status(401).json({ 
          success: false, 
          message: 'Event password required',
          requiresPassword: true
        });
      }
    }

    req.event = event;
    next();
  } catch (error) {
    console.error('Event access validation error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error validating event access' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireEventOwnership,
  optionalAuth,
  userRateLimit,
  generateToken,
  generateRefreshToken,
  validateEventAccess
};