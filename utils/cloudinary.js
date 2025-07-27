const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage configuration for different file types
const createStorage = (folder, resourceType = 'auto') => {
  return multer.memoryStorage();
};

// Media storage (photos and videos)
const mediaStorage = createStorage('media');

// Audio storage (for guestbook audio messages)
const audioStorage = createStorage('audio', 'raw');

// Cover photo storage
const coverStorage = createStorage('covers', 'image');

// Profile photo storage
const profileStorage = createStorage('profiles', 'image');

// Multer configurations
const createMulterConfig = (storage, fileFilter = null) => {
  const config = {
    storage: storage,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
      files: parseInt(process.env.MAX_FILES_PER_UPLOAD) || 10
    }
  };

  if (fileFilter) {
    config.fileFilter = fileFilter;
  }

  return multer(config);
};

// File filters
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const mediaFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

const audioFilter = (req, file, cb) => {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

// Multer instances
const uploadMedia = createMulterConfig(mediaStorage, mediaFilter);
const uploadAudio = createMulterConfig(audioStorage, audioFilter);
const uploadCover = createMulterConfig(coverStorage, imageFilter);
const uploadProfile = createMulterConfig(profileStorage, imageFilter);

// Upload multiple media files
const uploadMultipleMedia = uploadMedia.array('media', 10);
const uploadSingleMedia = uploadMedia.single('media');
const uploadSingleAudio = uploadAudio.single('audio');
const uploadSingleCover = uploadCover.single('cover');
const uploadSingleProfile = uploadProfile.single('profile');

// Cloudinary upload options for different transformations
const getImageTransformations = (type = 'default') => {
  const transformations = {
    thumbnail: [
      { width: 200, height: 200, crop: 'fill' },
      { quality: 'auto:low' },
      { fetch_format: 'auto' }
    ],
    small: [
      { width: 400, height: 400, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    medium: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    large: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    cover: [
      { width: 1920, height: 1080, crop: 'fill' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    profile: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ]
  };

  return transformations[type] || transformations.default;
};

// Generate multiple image sizes
const generateImageVariants = async (publicId, type = 'default') => {
  const variants = {};
  const sizes = ['thumbnail', 'small', 'medium', 'large'];

  for (const size of sizes) {
    try {
      const transformation = getImageTransformations(size);
      variants[size] = {
        url: cloudinary.url(publicId, { transformation }),
        size: null // Size will be calculated if needed
      };
    } catch (error) {
      console.error(`Error generating ${size} variant:`, error);
    }
  }

  return variants;
};

// Delete file from Cloudinary
const deleteFile = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Get file info from Cloudinary
const getFileInfo = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error getting file info from Cloudinary:', error);
    throw error;
  }
};

// Generate signed upload URL for direct client uploads
const generateSignedUpload = (folder, transformation = null) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const params = {
    timestamp,
    folder: `wedding-memories/${folder}`,
    ...(transformation && { transformation })
  };

  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  return {
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    folder: params.folder
  };
};

// Upload file to cloudinary
const uploadToCloudinary = async (file, folder, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `wedding-memories/${folder}`,
      resource_type: resourceType,
      public_id: uuidv4(),
      quality: 'auto:good',
      fetch_format: 'auto'
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(file.buffer);
  });
};

// Extract metadata from uploaded file
const extractMetadata = async (file, folder = 'media') => {
  // Upload to cloudinary first
  const resourceType = file.mimetype.startsWith('image/') ? 'image' : 
                      file.mimetype.startsWith('video/') ? 'video' : 'raw';
  
  const cloudinaryResult = await uploadToCloudinary(file, folder, resourceType);
  
  const metadata = {
    originalName: file.originalname,
    fileName: cloudinaryResult.public_id,
    fileSize: file.size,
    mimeType: file.mimetype,
    url: cloudinaryResult.secure_url,
    cloudinaryPublicId: cloudinaryResult.public_id,
    fileType: file.mimetype.startsWith('image/') ? 'image' : 
              file.mimetype.startsWith('video/') ? 'video' : 'audio'
  };

  // Add Cloudinary specific metadata if available
  if (cloudinaryResult.width && cloudinaryResult.height) {
    metadata.dimensions = {
      width: cloudinaryResult.width,
      height: cloudinaryResult.height
    };
  }

  if (cloudinaryResult.duration) {
    metadata.duration = cloudinaryResult.duration;
  }

  return metadata;
};

// Validate file type and size
const validateFile = (file, eventSettings = {}) => {
  const maxSize = eventSettings.maxFileSize || parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
  const allowedTypes = eventSettings.allowedFileTypes || [
    'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'
  ];

  if (file.size > maxSize) {
    throw new Error(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
  }

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} is not allowed`);
  }

  return true;
};

module.exports = {
  cloudinary,
  uploadMultipleMedia,
  uploadSingleMedia,
  uploadSingleAudio,
  uploadSingleCover,
  uploadSingleProfile,
  generateImageVariants,
  deleteFile,
  getFileInfo,
  generateSignedUpload,
  extractMetadata,
  validateFile,
  getImageTransformations
};