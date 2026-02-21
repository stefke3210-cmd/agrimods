// src/routes/download.routes.js
const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/download.controller');
const { protect } = require('../controllers/auth.controller');
const { restrictTo } = require('../controllers/auth.controller');

// ==================== PUBLIC ROUTES ====================

// @route   GET /api/v1/download/mod/:modId
// @desc    Download a mod (free/public mods)
// @access  Public
router.get('/mod/:modId', downloadController.downloadMod);

// @route   GET /api/v1/download/bundle/:bundleId
// @desc    Download a bundle (free/public bundles)
// @access  Public
router.get('/bundle/:bundleId', downloadController.downloadBundle);

// @route   GET /api/v1/download/resource/:resourceId
// @desc    Download a resource file
// @access  Public
router.get('/resource/:resourceId', downloadController.downloadResource);

// @route   GET /api/v1/download/preview/:fileId
// @desc    Preview a file before download (streaming)
// @access  Public
router.get('/preview/:fileId', downloadController.previewFile);

// ==================== PROTECTED ROUTES (Require Login) ====================

// @route   GET /api/v1/download/mod/:modId
// @desc    Download a mod (requires login for tracking)
// @access  Private
router.get('/mod/:modId', protect, downloadController.downloadMod);

// @route   GET /api/v1/download/bundle/:bundleId
// @desc    Download a bundle (requires login for tracking)
// @access  Private
router.get('/bundle/:bundleId', protect, downloadController.downloadBundle);

// @route   GET /api/v1/download/premium/:itemId
// @desc    Download premium content (requires purchase verification)
// @access  Private
router.get('/premium/:itemId', protect, downloadController.downloadPremiumContent);

// @route   GET /api/v1/download/purchased/:orderId
// @desc    Download all items from a purchase order
// @access  Private
router.get('/purchased/:orderId', protect, downloadController.downloadPurchasedItems);

// ==================== DOWNLOAD HISTORY ROUTES ====================

// @route   GET /api/v1/download/history
// @desc    Get current user's download history
// @access  Private
router.get('/history', protect, downloadController.getDownloadHistory);

// @route   GET /api/v1/download/history/:downloadId
// @desc    Get specific download details
// @access  Private
router.get('/history/:downloadId', protect, downloadController.getDownloadDetails);

// @route   GET /api/v1/download/history/mod/:modId
// @desc    Check if user has downloaded a specific mod before
// @access  Private
router.get('/history/mod/:modId', protect, downloadController.checkDownloadHistory);

// @route   DELETE /api/v1/download/history/:downloadId
// @desc    Remove a download from history
// @access  Private
router.delete('/history/:downloadId', protect, downloadController.removeFromHistory);

// @route   GET /api/v1/download/history/export
// @desc    Export download history as CSV/JSON
// @access  Private
router.get('/history/export', protect, downloadController.exportDownloadHistory);

// ==================== DOWNLOAD TOKEN ROUTES ====================

// @route   POST /api/v1/download/token
// @desc    Generate a secure download token
// @access  Private
router.post('/token', protect, downloadController.generateDownloadToken);

// @route   GET /api/v1/download/token/:token
// @desc    Download using a secure token (for email links, etc.)
// @access  Public (token-based auth)
router.get('/token/:token', downloadController.downloadWithToken);

// @route   DELETE /api/v1/download/token/:token
// @desc    Revoke a download token
// @access  Private
router.delete('/token/:token', protect, downloadController.revokeDownloadToken);

// ==================== BATCH DOWNLOAD ROUTES ====================

// @route   POST /api/v1/download/batch
// @desc    Initiate batch download (multiple files)
// @access  Private
router.post('/batch', protect, downloadController.initiateBatchDownload);

// @route   GET /api/v1/download/batch/:batchId
// @desc    Get batch download status and files
// @access  Private
router.get('/batch/:batchId', protect, downloadController.getBatchDownloadStatus);

// @route   GET /api/v1/download/batch/:batchId/zip
// @desc    Download batch as ZIP archive
// @access  Private
router.get('/batch/:batchId/zip', protect, downloadController.downloadBatchAsZip);

// @route   DELETE /api/v1/download/batch/:batchId
// @desc    Cancel a batch download
// @access  Private
router.delete('/batch/:batchId', protect, downloadController.cancelBatchDownload);

// ==================== DOWNLOAD STATISTICS ROUTES ====================

// @route   GET /api/v1/download/stats
// @desc    Get download statistics for current user
// @access  Private
router.get('/stats', protect, downloadController.getUserDownloadStats);

// @route   GET /api/v1/download/stats/mod/:modId
// @desc    Get download statistics for a specific mod
// @access  Public
router.get('/stats/mod/:modId', downloadController.getModDownloadStats);

// @route   GET /api/v1/download/stats/bundle/:bundleId
// @desc    Get download statistics for a specific bundle
// @access  Public
router.get('/stats/bundle/:bundleId', downloadController.getBundleDownloadStats);

// @route   GET /api/v1/download/stats/trending
// @desc    Get trending downloads (most downloaded)
// @access  Public
router.get('/stats/trending', downloadController.getTrendingDownloads);

// @route   GET /api/v1/download/stats/recent
// @desc    Get recent downloads
// @access  Public
router.get('/stats/recent', downloadController.getRecentDownloads);

// ==================== DOWNLOAD LIMIT ROUTES ====================

// @route   GET /api/v1/download/limits
// @desc    Get current user's download limits
// @access  Private
router.get('/limits', protect, downloadController.getDownloadLimits);

// @route   GET /api/v1/download/limits/check/:itemId
// @desc    Check if user has reached download limit for an item
// @access  Private
router.get('/limits/check/:itemId', protect, downloadController.checkDownloadLimit);

// @route   POST /api/v1/download/limits/increase
// @desc    Request increase in download limits (premium users)
// @access  Private
router.post('/limits/increase', protect, downloadController.requestLimitIncrease);

// ==================== RESUME DOWNLOAD ROUTES ====================

// @route   POST /api/v1/download/resume
// @desc    Resume an interrupted download
// @access  Private
router.post('/resume', protect, downloadController.resumeDownload);

// @route   GET /api/v1/download/resume/:downloadId
// @desc    Get resume information for a download
// @access  Private
router.get('/resume/:downloadId', protect, downloadController.getResumeInfo);

// ==================== ADMIN ROUTES ====================

// @route   GET /api/v1/download/admin/all
// @desc    Get all downloads (Admin only)
// @access  Private/Admin
router.get('/admin/all', protect, restrictTo('admin', 'staff'), downloadController.getAllDownloads);

// @route   GET /api/v1/download/admin/stats
// @desc    Get global download statistics (Admin only)
// @access  Private/Admin
router.get('/admin/stats', protect, restrictTo('admin', 'staff'), downloadController.getGlobalDownloadStats);

// @route   GET /api/v1/download/admin/user/:userId
// @desc    Get all downloads by a specific user (Admin only)
// @access  Private/Admin
router.get('/admin/user/:userId', protect, restrictTo('admin', 'staff'), downloadController.getUserDownloadsByAdmin);

// @route   GET /api/v1/download/admin/mod/:modId
// @desc    Get all downloads for a specific mod (Admin only)
// @access  Private/Admin
router.get('/admin/mod/:modId', protect, restrictTo('admin', 'staff'), downloadController.getModDownloadsByAdmin);

// @route   GET /api/v1/download/admin/suspicious
// @desc    Get suspicious download activity (Admin only)
// @access  Private/Admin
router.get('/admin/suspicious', protect, restrictTo('admin', 'staff'), downloadController.getSuspiciousDownloads);

// @route   POST /api/v1/download/admin/block-user/:userId
// @desc    Block a user from downloading (Admin only)
// @access  Private/Admin
router.post('/admin/block-user/:userId', protect, restrictTo('admin'), downloadController.blockUserFromDownloads);

// @route   DELETE /api/v1/download/admin/block-user/:userId
// @desc    Unblock a user from downloading (Admin only)
// @access  Private/Admin
router.delete('/admin/block-user/:userId', protect, restrictTo('admin'), downloadController.unblockUserFromDownloads);

// @route   GET /api/v1/download/admin/blocked-users
// @desc    Get list of blocked users (Admin only)
// @access  Private/Admin
router.get('/admin/blocked-users', protect, restrictTo('admin', 'staff'), downloadController.getBlockedUsers);

// @route   DELETE /api/v1/download/admin/:downloadId
// @desc    Delete a download record (Admin only)
// @access  Private/Admin
router.delete('/admin/:downloadId', protect, restrictTo('admin', 'staff'), downloadController.deleteDownloadRecord);

// @route   POST /api/v1/download/admin/cleanup
// @desc    Clean up old download records (Admin only)
// @access  Private/Admin
router.post('/admin/cleanup', protect, restrictTo('admin'), downloadController.cleanupOldDownloads);

// ==================== WEBHOOK ROUTES ====================

// @route   POST /api/v1/download/webhook/cdn
// @desc    Webhook for CDN download completion
// @access  Private (CDN service only)
router.post('/webhook/cdn', downloadController.handleCDNWebhook);

// @route   POST /api/v1/download/webhook/analytics
// @desc    Webhook for analytics tracking
// @access  Private (Analytics service only)
router.post('/webhook/analytics', downloadController.handleAnalyticsWebhook);

// ==================== UTILITY ROUTES ====================

// @route   GET /api/v1/download/check/:itemId
// @desc    Check if user can download an item
// @access  Private
router.get('/check/:itemId', protect, downloadController.checkDownloadPermission);

// @route   POST /api/v1/download/report/:downloadId
// @desc    Report a download issue (broken file, wrong content, etc.)
// @access  Private
router.post('/report/:downloadId', protect, downloadController.reportDownloadIssue);

// @route   GET /api/v1/download/report/:downloadId
// @desc    Get status of a reported download issue
// @access  Private
router.get('/report/:downloadId', protect, downloadController.getReportStatus);

// @route   POST /api/v1/download/request/:itemId
// @desc    Request access to download a restricted item
// @access  Private
router.post('/request/:itemId', protect, downloadController.requestDownloadAccess);

// @route   GET /api/v1/download/request/:requestId
// @desc    Get status of a download access request
// @access  Private
router.get('/request/:requestId', protect, downloadController.getAccessRequestStatus);

// ==================== CDN ROUTES ====================

// @route   GET /api/v1/download/cdn/generate-url/:fileId
// @desc    Generate a CDN download URL
// @access  Private
router.get('/cdn/generate-url/:fileId', protect, downloadController.generateCDNUrl);

// @route   POST /api/v1/download/cdn/invalidate/:fileId
// @desc    Invalidate a CDN URL (force refresh)
// @access  Private/Admin
router.post('/cdn/invalidate/:fileId', protect, restrictTo('admin'), downloadController.invalidateCDNUrl);

module.exports = router;
