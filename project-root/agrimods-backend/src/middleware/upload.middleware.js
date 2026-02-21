// src/middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');

// Ensure upload directories exist
const uploadDirs = [
  'uploads/mods',
  'uploads/avatars',
  'uploads/screenshots',
  'uploads/temp'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ==================== STORAGE CONFIGURATIONS ====================

// Storage for mod files
const modStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/mods/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `mod-${uniqueSuffix}${ext}`);
  }
});

// Storage for user avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

// Storage for mod screenshots/images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/screenshots/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

// ==================== FILE FILTERS ====================

// Filter for mod files
const modFileFilter = (req, file, cb) => {
  const allowedTypes = ['.zip', '.jar', '.mod', '.mcpack', '.mcaddon'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`, 400), false);
  }
};

// Filter for image files
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed', 400), false);
  }
};

// Filter for avatar files
const avatarFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images (JPEG, PNG, WebP) are allowed for avatars', 400), false);
  }
};

// ==================== MULTER INSTANCES ====================

// Mod file upload (max 50MB)
exports.uploadMod = multer({
  storage: modStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: modFileFilter
}).single('modFile');

// Avatar upload (max 5MB)
exports.uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: avatarFileFilter
}).single('avatar');

// Screenshot/images upload (max 10MB per file, max 5 files)
exports.uploadImages = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per file
  },
  fileFilter: imageFileFilter
}).array('images', 5);

// Multiple file upload (for different purposes)
exports.uploadMultiple = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/temp/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `file-${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB per file
  }
}).fields([
  { name: 'modFile', maxCount: 1 },
  { name: 'screenshots', maxCount: 5 },
  { name: 'documentation', maxCount: 1 }
]);

// ==================== ERROR HANDLING MIDDLEWARE ====================

// Handle multer errors
exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size too large', 400));
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files uploaded', 400));
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected field', 400));
    } else {
      return next(new AppError(`Upload error: ${err.message}`, 400));
    }
  } else if (err) {
    return next(new AppError(err.message, 400));
  }
  next();
};

// ==================== HELPER FUNCTIONS ====================

// Check if file exists
exports.fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

// Delete file
exports.deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Get file size in MB
exports.getFileSizeMB = (filePath) => {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
};

// Validate file type by extension
exports.validateFileType = (filename, allowedExtensions) => {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.map(e => e.toLowerCase()).includes(ext);
};

// ==================== CUSTOM MIDDLEWARE FOR VALIDATION ====================

// Middleware to check if file was uploaded
exports.requireFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return next(new AppError('No file uploaded', 400));
  }
  next();
};

// Middleware to validate file size (custom)
exports.validateFileSize = (maxSizeMB) => {
  return (req, res, next) => {
    if (req.file && req.file.size > maxSizeMB * 1024 * 1024) {
      return next(new AppError(`File size must be less than ${maxSizeMB}MB`, 400));
    }
    next();
  };
};

// Middleware to validate file type (custom)
exports.validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!allowedTypes.map(t => t.toLowerCase()).includes(ext)) {
        return next(new AppError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`, 400));
      }
    }
    next();
  };
};
