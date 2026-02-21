const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Mod = require('../models/Mod');
const User = require('../models/User');
const Download = require('../models/Download');

// Verify user has access to mod
const verifyModAccess = async (userId, modId) => {
  const user = await User.findById(userId);
  
  // Check if user has active subscription
  if (user.activeSubscription && new Date() < user.subscriptionExpiry) {
    return true;
  }
  
  // Check if user purchased the mod
  return user.purchasedMods.includes(modId);
};

// Download mod file
exports.downloadMod = catchAsync(async (req, res, next) => {
  const { modId } = req.params;
  
  // Verify user access
  const hasAccess = await verifyModAccess(req.user.id, modId);
  if (!hasAccess) {
    return next(new AppError('You do not have access to this mod', 403));
  }
  
  // Get mod details
  const mod = await Mod.findById(modId);
  if (!mod) {
    return next(new AppError('Mod not found', 404));
  }
  
  // Verify file exists
  const filePath = path.join(__dirname, '../../uploads/mods', mod.fileUrl);
  if (!fs.existsSync(filePath)) {
    return next(new AppError('Mod file not found on server', 404));
  }
  
  // Record download
  await Download.create({
    user: req.user.id,
    mod: modId,
    ip: req.ip
  });
  
  // Update download count
  mod.downloadCount += 1;
  await mod.save();
  
  // Set headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${mod.fileName}"`);
  res.setHeader('Content-Type', 'application/zip');
  
  // Stream file to client
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  // Handle errors
  fileStream.on('error', (err) => {
    console.error('File stream error:', err);
    return next(new AppError('Error streaming file', 500));
  });
});

// Get download history
exports.getDownloadHistory = catchAsync(async (req, res, next) => {
  const downloads = await Download.find({ user: req.user.id })
    .populate('mod', 'name version compatibleWith')
    .sort('-downloadedAt')
    .limit(20);
  
  res.status(200).json({
    status: 'success',
    results: downloads.length,
    data: {
      downloads
    }
  });
});

// Get mod preview video
exports.getPreviewVideo = catchAsync(async (req, res, next) => {
  const { modId } = req.params;
  
  // Get mod details
  const mod = await Mod.findById(modId);
  if (!mod || !mod.previewVideoUrl) {
    return next(new AppError('Preview video not available', 404));
  }
  
  // Stream video file
  const videoPath = path.join(__dirname, '../../uploads/previews', mod.previewVideoUrl);
  
  if (!fs.existsSync(videoPath)) {
    return next(new AppError('Preview video not found', 404));
  }
  
  res.setHeader('Content-Type', 'video/mp4');
  fs.createReadStream(videoPath).pipe(res);

});

// download.controller.js should export:
module.exports = {
  // Public Downloads
  downloadMod,
  downloadBundle,
  downloadResource,
  previewFile,
  
  // Protected Downloads
  downloadPremiumContent,
  downloadPurchasedItems,
  
  // History
  getDownloadHistory,
  getDownloadDetails,
  checkDownloadHistory,
  removeFromHistory,
  exportDownloadHistory,
  
  // Token
  generateDownloadToken,
  downloadWithToken,
  revokeDownloadToken,
  
  // Batch
  initiateBatchDownload,
  getBatchDownloadStatus,
  downloadBatchAsZip,
  cancelBatchDownload,
  
  // Statistics
  getUserDownloadStats,
  getModDownloadStats,
  getBundleDownloadStats,
  getTrendingDownloads,
  getRecentDownloads,
  
  // Limits
  getDownloadLimits,
  checkDownloadLimit,
  requestLimitIncrease,
  
  // Resume
  resumeDownload,
  getResumeInfo,
  
  // Admin
  getAllDownloads,
  getGlobalDownloadStats,
  getUserDownloadsByAdmin,
  getModDownloadsByAdmin,
  getSuspiciousDownloads,
  blockUserFromDownloads,
  unblockUserFromDownloads,
  getBlockedUsers,
  deleteDownloadRecord,
  cleanupOldDownloads,
  
  // Webhooks
  handleCDNWebhook,
  handleAnalyticsWebhook,
  
  // Utility
  checkDownloadPermission,
  reportDownloadIssue,
  getReportStatus,
  requestDownloadAccess,
  getAccessRequestStatus,
  
  // CDN
  generateCDNUrl,
  invalidateCDNUrl
};
