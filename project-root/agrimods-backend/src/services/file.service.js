// src/services/file.service.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/appError');

// Ensure directory exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Generate unique filename
const generateFilename = (originalname) => {
  const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname);
  return `${uniqueSuffix}${ext}`;
};

// Get file size in bytes
const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    throw new AppError('File not found', 404);
  }
};

// Get file size in human readable format
const getFileSizeFormatted = (filePath) => {
  const bytes = getFileSize(filePath);
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file MIME type
const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.jar': 'application/java-archive',
    '.txt': 'text/plain',
    '.md': 'text/markdown'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Upload file
const uploadFile = (file, directory = 'uploads') => {
  return new Promise((resolve, reject) => {
    try {
      ensureDir(directory);
      
      const filename = generateFilename(file.originalname);
      const filePath = path.join(directory, filename);

      // Write file
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) {
          reject(new AppError('Failed to save file', 500));
        } else {
          resolve({
            filename,
            filePath,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            url: `/ ${directory}/${filename}`
          });
        }
      });
    } catch (error) {
      reject(new AppError('Upload failed: ' + error.message, 500));
    }
  });
};

// Upload file from path (for multer)
const uploadFileFromPath = (file, directory = 'uploads') => {
  return new Promise((resolve, reject) => {
    try {
      ensureDir(directory);
      
      const filename = generateFilename(file.originalname || file.filename);
      const newPath = path.join(directory, filename);

      // Move file
      fs.rename(file.path, newPath, (err) => {
        if (err) {
          // If rename fails, try copy
          fs.copyFile(file.path, newPath, (copyErr) => {
            if (copyErr) {
              reject(new AppError('Failed to save file', 500));
            } else {
              fs.unlink(file.path, () => {}); // Delete original
              resolve({
                filename,
                filePath: newPath,
                originalName: file.originalname || file.filename,
                size: file.size,
                mimeType: getMimeType(newPath),
                url: `/${directory}/${filename}`
              });
            }
          });
        } else {
          resolve({
            filename,
            filePath: newPath,
            originalName: file.originalname || file.filename,
            size: file.size,
            mimeType: getMimeType(newPath),
            url: `/${directory}/${filename}`
          });
        }
      });
    } catch (error) {
      reject(new AppError('Upload failed: ' + error.message, 500));
    }
  });
};

// Delete file
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        resolve({ success: false, message: 'File does not exist' });
        return;
      }

      fs.unlink(filePath, (err) => {
        if (err) {
          reject(new AppError('Failed to delete file', 500));
        } else {
          resolve({ success: true, message: 'File deleted successfully' });
        }
      });
    } catch (error) {
      reject(new AppError('Delete failed: ' + error.message, 500));
    }
  });
};

// Delete multiple files
const deleteMultipleFiles = (filePaths) => {
  return Promise.all(
    filePaths.map(filePath => deleteFile(filePath).catch(err => ({ success: false, error: err.message })))
  );
};

// Get file content
const getFileContent = (filePath, encoding = 'utf-8') => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, encoding, (err, data) => {
      if (err) {
        reject(new AppError('Failed to read file', 500));
      } else {
        resolve(data);
      }
    });
  });
};

// Get file as buffer
const getFileBuffer = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(new AppError('Failed to read file', 500));
      } else {
        resolve(data);
      }
    });
  });
};

// Check if file exists
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

// Get file stats
const getFileStats = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    throw new AppError('File not found', 404);
  }
};

// Copy file
const copyFile = (sourcePath, destPath) => {
  return new Promise((resolve, reject) => {
    fs.copyFile(sourcePath, destPath, (err) => {
      if (err) {
        reject(new AppError('Failed to copy file', 500));
      } else {
        resolve({ success: true, message: 'File copied successfully' });
      }
    });
  });
};

// Move file
const moveFile = (sourcePath, destPath) => {
  return new Promise((resolve, reject) => {
    fs.rename(sourcePath, destPath, (err) => {
      if (err) {
        reject(new AppError('Failed to move file', 500));
      } else {
        resolve({ success: true, message: 'File moved successfully' });
      }
    });
  });
};

// Get files in directory
const getFilesInDirectory = (dirPath, extension = null) => {
  try {
    const files = fs.readdirSync(dirPath);
    if (extension) {
      return files.filter(file => path.extname(file) === extension);
    }
    return files;
  } catch (error) {
    throw new AppError('Failed to read directory', 500);
  }
};

// Clean up old files (older than specified days)
const cleanupOldFiles = (directory, maxAgeDays = 7) => {
  return new Promise((resolve, reject) => {
    try {
      const files = getFilesInDirectory(directory);
      const now = Date.now();
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      files.forEach(file => {
        const filePath = path.join(directory, file);
        const stats = getFileStats(filePath);
        
        if (now - stats.modified.getTime() > maxAge) {
          deleteFile(filePath).then(() => {
            deletedCount++;
          }).catch(() => {});
        }
      });

      setTimeout(() => {
        resolve({ success: true, deletedCount, message: `Cleaned up ${deletedCount} old files` });
      }, 1000);
    } catch (error) {
      reject(new AppError('Cleanup failed: ' + error.message, 500));
    }
  });
};

// Public methods
module.exports = {
  uploadFile,
  uploadFileFromPath,
  deleteFile,
  deleteMultipleFiles,
  getFileContent,
  getFileBuffer,
  fileExists,
  getFileStats,
  getFileSize,
  getFileSizeFormatted,
  getMimeType,
  copyFile,
  moveFile,
  getFilesInDirectory,
  cleanupOldFiles,
  generateFilename,
  ensureDir
};
