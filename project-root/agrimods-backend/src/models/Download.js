// src/models/download.model.js
const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
  // What was downloaded
  mod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mod',
    required: [true, 'Download must be associated with a mod']
  },
  
  bundle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bundle'
  },
  
  // Who downloaded
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Download must be associated with a user']
  },
  
  // Download details
  downloadType: {
    type: String,
    enum: ['mod', 'bundle', 'resource'],
    default: 'mod'
  },
  
  fileUrl: {
    type: String,
    required: [true, 'Download must have a file URL']
  },
  
  fileName: {
    type: String,
    required: [true, 'Download must have a file name']
  },
  
  fileSize: {
    type: Number,
    required: [true, 'Download must have a file size']
  },
  
  // Tracking
  ipAddress: {
    type: String,
    required: [true, 'Download must have an IP address']
  },
  
  userAgent: {
    type: String,
    required: [true, 'Download must have a user agent']
  },
  
  country: String,
  city: String,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Download session
  sessionId: {
    type: String,
    required: [true, 'Download must have a session ID']
  },
  
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: Date,
  
  // Error tracking
  errorCode: String,
  errorMessage: String,
  
  // Metadata
  metadata: {
    browser: String,
    os: String,
    device: String,
    referrer: String
  }
}, {
  timestamps: true
});

// Set completed timestamp when status changes to completed
downloadSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Static method to count downloads for a mod
downloadSchema.statics.countDownloadsForMod = async function(modId) {
  return await this.countDocuments({ mod: modId, status: 'completed' });
};

// Static method to count downloads for a user
downloadSchema.statics.countDownloadsForUser = async function(userId) {
  return await this.countDocuments({ user: userId, status: 'completed' });
};

// Static method to get recent downloads
downloadSchema.statics.getRecentDownloads = async function(limit = 10) {
  return await this.find({ status: 'completed' })
    .populate('mod', 'name slug')
    .populate('user', 'name username')
    .sort('-completedAt')
    .limit(limit);
};

// Static method to get download statistics
downloadSchema.statics.getDownloadStats = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          mod: '$mod'
        },
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' }
      }
    },
    {
      $sort: { '_id.date': -1 }
    }
  ]);
  
  return stats;
};

// Static method to check if user already downloaded
downloadSchema.statics.userAlreadyDownloaded = async function(userId, modId) {
  const download = await this.findOne({
    user: userId,
    mod: modId,
    status: 'completed'
  });
  
  return !!download;
};

// Index for faster queries
downloadSchema.index({ mod: 1, status: 1 });
downloadSchema.index({ user: 1, status: 1 });
downloadSchema.index({ sessionId: 1 });
downloadSchema.index({ completedAt: -1 });
downloadSchema.index({ createdAt: -1 });
downloadSchema.index({ status: 1 });

// Compound index for unique user-mod download
downloadSchema.index({ user: 1, mod: 1, sessionId: 1 });

module.exports = mongoose.model('Download', downloadSchema);
