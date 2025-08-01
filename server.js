const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const mediaRoutes = require('./routes/media');
const guestbookRoutes = require('./routes/guestbook');
const qrRoutes = require('./routes/qr');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB with better error handling
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding-memories';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('⚠️  Running without database - some features will be limited');
    console.log('💡 To enable full functionality, install MongoDB or set up a cloud database');
  }
};

connectDB();

// Session configuration (after database connection attempt)
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Only use MongoStore if MongoDB is connected
if (mongoose.connection.readyState === 1) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding-memories',
    touchAfter: 24 * 3600 // lazy session update
  });
}

app.use(session(sessionConfig));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "blob:"],
      mediaSrc: ["'self'", "https://res.cloudinary.com", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));



// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join event room
  socket.on('join-event', (eventId) => {
    socket.join(eventId);
    console.log(`User ${socket.id} joined event ${eventId}`);
  });

  // Leave event room
  socket.on('leave-event', (eventId) => {
    socket.leave(eventId);
    console.log(`User ${socket.id} left event ${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/guestbook', guestbookRoutes);
app.use('/api/qr', qrRoutes);

// Mock data route for demo purposes when database is not available
app.get('/api/mock/status', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };