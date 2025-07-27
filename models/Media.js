const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  uploader: {
    type: {
      type: String,
      enum: ['guest', 'host', 'photographer'],
      default: 'guest'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    guestName: {
      type: String,
      trim: true,
      default: 'Anonymous Guest'
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    }
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image', 'video', 'audio']
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  dimensions: {
    width: {
      type: Number,
      default: null
    },
    height: {
      type: Number,
      default: null
    }
  },
  duration: {
    type: Number,
    default: null // For videos and audio in seconds
  },
  album: {
    type: String,
    default: 'All Photos'
  },
  tags: [{
    type: String,
    trim: true
  }],
  caption: {
    type: String,
    trim: true,
    maxlength: 500
  },
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
  metadata: {
    camera: {
      type: String,
      default: null
    },
    lens: {
      type: String,
      default: null
    },
    iso: {
      type: Number,
      default: null
    },
    aperture: {
      type: String,
      default: null
    },
    shutterSpeed: {
      type: String,
      default: null
    },
    focalLength: {
      type: Number,
      default: null
    },
    dateTimeTaken: {
      type: Date,
      default: null
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
    comments: [{
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
    }],
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    }
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
  isFeatured: {
    type: Boolean,
    default: false
  },
  processingStatus: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed'],
    default: 'completed'
  },
  quality: {
    original: {
      url: String,
      size: Number
    },
    large: {
      url: String,
      size: Number
    },
    medium: {
      url: String,
      size: Number
    },
    small: {
      url: String,
      size: Number
    },
    thumbnail: {
      url: String,
      size: Number
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
mediaSchema.index({ event: 1, createdAt: -1 });
mediaSchema.index({ event: 1, album: 1 });
mediaSchema.index({ event: 1, fileType: 1 });
mediaSchema.index({ event: 1, status: 1 });
mediaSchema.index({ 'uploader.userId': 1 });
mediaSchema.index({ isFeatured: 1 });
mediaSchema.index({ tags: 1 });

// Virtual for like count
mediaSchema.virtual('likeCount').get(function() {
  return this.interactions.likes.length;
});

// Virtual for comment count
mediaSchema.virtual('commentCount').get(function() {
  return this.interactions.comments.filter(comment => comment.isApproved).length;
});

// Virtual for file size in human readable format
mediaSchema.virtual('fileSizeFormatted').get(function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.fileSize === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for time ago
mediaSchema.virtual('timeAgo').get(function() {
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

// Method to add a like
mediaSchema.methods.addLike = function(guestName) {
  const existingLike = this.interactions.likes.find(like => like.guestName === guestName);
  if (!existingLike) {
    this.interactions.likes.push({ guestName });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove a like
mediaSchema.methods.removeLike = function(guestName) {
  this.interactions.likes = this.interactions.likes.filter(like => like.guestName !== guestName);
  return this.save();
};

// Method to add a comment
mediaSchema.methods.addComment = function(guestName, message, needsApproval = false) {
  this.interactions.comments.push({
    guestName,
    message,
    isApproved: !needsApproval
  });
  return this.save();
};

// Method to increment view count
mediaSchema.methods.incrementViews = function() {
  this.interactions.views += 1;
  return this.save();
};

// Method to increment download count
mediaSchema.methods.incrementDownloads = function() {
  this.interactions.downloads += 1;
  return this.save();
};

module.exports = mongoose.model('Media', mediaSchema);