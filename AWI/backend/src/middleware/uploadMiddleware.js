const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = ['uploads/images', 'uploads/videos', 'uploads/audio'];
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '../../', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

ensureUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';

    // Determine upload directory based on file type
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audio/';
    } else {
      return cb(new Error('Invalid file type'));
    }

    cb(null, path.join(__dirname, '../../', uploadPath));
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
    cb(null, `${uniqueSuffix}-${sanitizedBasename}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(',');
  const allowedVideoTypes = (process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm,video/ogg').split(',');
  const allowedAudioTypes = (process.env.ALLOWED_AUDIO_TYPES || 'audio/mpeg,audio/wav,audio/ogg').split(',');

  const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedAudioTypes];

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allAllowedTypes.join(', ')}`), false);
  }
};

// Create multer upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB default
    files: 10 // Max 10 files per request
  }
});

// Custom middleware to check file size based on type
const checkFileSizeByType = (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  const files = req.files || [req.file];
  const maxImageSize = parseInt(process.env.MAX_IMAGE_SIZE) || 10485760; // 10MB
  const maxVideoSize = parseInt(process.env.MAX_VIDEO_SIZE) || 52428800; // 50MB
  const maxAudioSize = parseInt(process.env.MAX_AUDIO_SIZE) || 20971520; // 20MB

  for (const file of files) {
    if (file.mimetype.startsWith('image/') && file.size > maxImageSize) {
      return res.status(400).json({
        success: false,
        error: `Image file ${file.originalname} exceeds maximum size of ${maxImageSize / 1024 / 1024}MB`
      });
    }
    if (file.mimetype.startsWith('video/') && file.size > maxVideoSize) {
      return res.status(400).json({
        success: false,
        error: `Video file ${file.originalname} exceeds maximum size of ${maxVideoSize / 1024 / 1024}MB`
      });
    }
    if (file.mimetype.startsWith('audio/') && file.size > maxAudioSize) {
      return res.status(400).json({
        success: false,
        error: `Audio file ${file.originalname} exceeds maximum size of ${maxAudioSize / 1024 / 1024}MB`
      });
    }
  }

  next();
};

module.exports = {
  upload,
  checkFileSizeByType,
  uploadSingle: upload.single('file'),
  uploadMultiple: upload.array('files', 10)
};
