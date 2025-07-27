const mongoose = require('mongoose');

const guestbookSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  guestName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  guestEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  messageType: {
    type: String,
    enum: ['text', 'audio', 'mixed'],
    default: 'text'
  },
  textMessage: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  audioMessage: {
    url: {
      type: String,
      default: null
    },
    duration: {
      type: Number,
      default: null // Duration in seconds
    },
    cloudinaryPublicId: {
      type: String,
      default: null
    }
  },
  attachedMedia: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  location: {
    name: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      }
    }
  },
  interactions: {
    likes: [{
      guestName: {
        type: String,
        trim: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    replies: [{
      guestName: {
        type: String,
        trim: true,
        required: true
      },
      message: {
        type: String,
        trim: true,
        required: true,
        maxlength: 300
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      isApproved: {
        type: Boolean,
        default: true
      }
    }]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  metadata: {
    userAgent: {
      type: String,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop'],
      default: null
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
guestbookSchema.index({ event: 1, createdAt: -1 });
guestbookSchema.index({ event: 1, status: 1 });
guestbookSchema.index({ event: 1, isPinned: -1, createdAt: -1 });
guestbookSchema.index({ guestName: 1 });

// Virtual for like count
guestbookSchema.virtual('likeCount').get(function() {
  return this.interactions.likes.length;
});

// Virtual for reply count
guestbookSchema.virtual('replyCount').get(function() {
  return this.interactions.replies.filter(reply => reply.isApproved).length;
});

// Virtual for time ago
guestbookSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInMs = now - this.createdAt;
  const diffInMinutes = Math.floor(diffInMs / 60000);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return this.createdAt.toLocaleDateString();
});

// Virtual for audio duration formatted
guestbookSchema.virtual('audioDurationFormatted').get(function() {
  if (!this.audioMessage.duration) return null;
  
  const minutes = Math.floor(this.audioMessage.duration / 60);
  const seconds = Math.floor(this.audioMessage.duration % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to add a like
guestbookSchema.methods.addLike = function(guestName) {
  const existingLike = this.interactions.likes.find(like => like.guestName === guestName);
  if (!existingLike) {
    this.interactions.likes.push({ guestName });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove a like
guestbookSchema.methods.removeLike = function(guestName) {
  this.interactions.likes = this.interactions.likes.filter(like => like.guestName !== guestName);
  return this.save();
};

// Method to add a reply
guestbookSchema.methods.addReply = function(guestName, message, needsApproval = false) {
  this.interactions.replies.push({
    guestName,
    message,
    isApproved: !needsApproval
  });
  return this.save();
};

// Validation for message content
guestbookSchema.pre('save', function(next) {
  if (this.messageType === 'text' && !this.textMessage) {
    return next(new Error('Text message is required for text type entries'));
  }
  
  if (this.messageType === 'audio' && !this.audioMessage.url) {
    return next(new Error('Audio message is required for audio type entries'));
  }
  
  if (this.messageType === 'mixed' && !this.textMessage && !this.audioMessage.url) {
    return next(new Error('Either text or audio message is required for mixed type entries'));
  }
  
  next();
});

module.exports = mongoose.model('Guestbook', guestbookSchema);