const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  coupleNames: {
    partner1: {
      type: String,
      required: true,
      trim: true
    },
    partner2: {
      type: String,
      required: true,
      trim: true
    }
  },
  eventDate: {
    type: Date,
    required: true
  },
  venue: {
    name: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    }
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  photographers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  coverPhoto: {
    type: String,
    default: null
  },
  theme: {
    colorScheme: {
      primary: {
        type: String,
        default: '#8B4513'
      },
      secondary: {
        type: String,
        default: '#D2B48C'
      },
      accent: {
        type: String,
        default: '#F5F5DC'
      }
    },
    style: {
      type: String,
      enum: ['classic', 'modern', 'rustic', 'elegant'],
      default: 'classic'
    },
    font: {
      type: String,
      enum: ['serif', 'sans-serif', 'script'],
      default: 'serif'
    }
  },
  privacy: {
    isPasswordProtected: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      default: null
    },
    allowDownloads: {
      type: Boolean,
      default: true
    },
    moderateUploads: {
      type: Boolean,
      default: false
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    allowLikes: {
      type: Boolean,
      default: true
    }
  },
  albums: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    coverPhoto: {
      type: String,
      default: null
    },
    order: {
      type: Number,
      default: 0
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  qrCode: {
    data: {
      type: String,
      default: null
    },
    imageUrl: {
      type: String,
      default: null
    }
  },
  statistics: {
    totalPhotos: {
      type: Number,
      default: 0
    },
    totalVideos: {
      type: Number,
      default: 0
    },
    totalGuestbookEntries: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    uniqueGuests: {
      type: Number,
      default: 0
    }
  },
  settings: {
    maxFileSize: {
      type: Number,
      default: 10485760 // 10MB
    },
    allowedFileTypes: [{
      type: String,
      default: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']
    }],
    enableSlideshow: {
      type: Boolean,
      default: true
    },
    slideshowInterval: {
      type: Number,
      default: 5000 // 5 seconds
    },
    enableGuestbook: {
      type: Boolean,
      default: true
    },
    enableAudioMessages: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  endDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
eventSchema.index({ host: 1 });
eventSchema.index({ eventDate: 1 });
eventSchema.index({ isActive: 1, isPublished: 1 });
eventSchema.index({ 'photographers': 1 });

// Pre-save middleware to create default albums
eventSchema.pre('save', function(next) {
  if (this.isNew && this.albums.length === 0) {
    this.albums = [
      { name: 'All Photos', description: 'All uploaded photos and videos', isDefault: true, order: 0 },
      { name: 'Ceremony', description: 'Wedding ceremony moments', order: 1 },
      { name: 'Reception', description: 'Reception celebrations', order: 2 },
      { name: 'Portraits', description: 'Portrait and couple photos', order: 3 },
      { name: 'Candid', description: 'Candid moments and fun shots', order: 4 }
    ];
  }
  next();
});

// Generate event URL slug
eventSchema.virtual('slug').get(function() {
  const names = `${this.coupleNames.partner1}-${this.coupleNames.partner2}`;
  const date = this.eventDate.toISOString().split('T')[0];
  return `${names.toLowerCase().replace(/\s+/g, '-')}-${date}`;
});

// Get event duration in days
eventSchema.virtual('duration').get(function() {
  if (!this.endDate) return 1;
  const diffTime = Math.abs(this.endDate - this.eventDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

// Transform output
eventSchema.methods.toJSON = function() {
  const eventObject = this.toObject();
  if (eventObject.privacy && eventObject.privacy.password) {
    delete eventObject.privacy.password;
  }
  return eventObject;
};

module.exports = mongoose.model('Event', eventSchema);