// src/routes/affiliate.routes.js
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

// Import middleware with proper path resolution
const { protect, adminOnly } = require('../middleware/auth');
const {
  validateRegisterAffiliate,
  validateUpdateAffiliateSettings,
  validateRequestPayout,
  validateMongoIdParam,
  validatePagination,
  handleValidationErrors,
  validateAdminAccess
} = require('../middleware/validation.middleware');

// Import controllers
const {
  registerAffiliate,
  getAffiliateProfile,
  updateAffiliateSettings,
  updateCommissionRate,
  approveAffiliate,
  suspendAffiliate,
  banAffiliate,
  getUserReferrals,
  getUserCommissions,
  getCommissionById,
  requestPayout,
  getUserPayouts,
  getPayoutById,
  getAffiliateDashboard,
  getEarningsSummary,
  getAllAffiliates,
  getAffiliateById,
  getAffiliateLeaderboard,
  deleteAffiliate
} = require('../controllers/affiliate.controller');

/**
 * Middleware: Verify user has active affiliate account
 * Blocks suspended/banned accounts
 */
const requireActiveAffiliate = async (req, res, next) => {
  try {
    const Affiliate = require('../models/Affiliate');
    const affiliate = await Affiliate.findOne({ 
      userId: req.user.id,
      status: { $nin: ['banned', 'suspended'] }
    }).lean();

    if (!affiliate) {
      return res.status(403).json({ 
        success: false, 
        message: 'Affiliate account required. Register at /api/affiliates/register' 
      });
    }

    if (affiliate.status === 'pending') {
      return res.status(403).json({ 
        success: false, 
        message: 'Affiliate account pending approval. Please wait for admin review.' 
      });
    }

    req.affiliate = affiliate;
    next();
  } catch (error) {
    console.error('Affiliate verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed. Please try again later.' 
    });
  }
};

/**
 * Middleware: Verify ownership or admin access
 * For routes accessing specific affiliate data
 */
const verifyAffiliateAccess = async (req, res, next) => {
  try {
    // Admins bypass ownership checks
    if (req.user.role === 'admin') return next();

    const Affiliate = require('../models/Affiliate');
    const affiliate = await Affiliate.findById(req.params.affiliateId);
    
    if (!affiliate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Affiliate account not found' 
      });
    }

    // Verify user owns this affiliate account
    if (affiliate.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: This affiliate account belongs to another user' 
      });
    }

    next();
  } catch (error) {
    console.error('Affiliate access verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Access verification failed' 
    });
  }
};

// ======================
// PUBLIC ROUTES (Authenticated)
// ======================

/**
 * @route   POST /api/affiliates/register
 * @desc    Register new affiliate account
 * @access  Private (Authenticated User)
 * @rateLimit 5 requests/hour per user
 */
router.post(
  '/register',
  protect,
  ...validateRegisterAffiliate(),
  handleValidationErrors,
  registerAffiliate
);

// ======================
// AFFILIATE-ONLY ROUTES
// ======================

/**
 * @route   GET /api/affiliates/profile
 * @desc    Get current user's affiliate profile
 * @access  Private (Active Affiliate)
 */
router.get(
  '/profile',
  protect,
  requireActiveAffiliate,
  getAffiliateProfile
);

/**
 * @route   PUT /api/affiliates/settings
 * @desc    Update affiliate settings
 * @access  Private (Active Affiliate)
 */
router.put(
  '/settings',
  protect,
  requireActiveAffiliate,
  ...validateUpdateAffiliateSettings(),
  handleValidationErrors,
  updateAffiliateSettings
);

/**
 * @route   GET /api/affiliates/referrals
 * @desc    Get user's referrals with pagination
 * @access  Private (Active Affiliate)
 */
router.get(
  '/referrals',
  protect,
  requireActiveAffiliate,
  ...validatePagination(),
  handleValidationErrors,
  getUserReferrals
);

/**
 * @route   GET /api/affiliates/commissions
 * @desc    Get user's commissions with filtering
 * @access  Private (Active Affiliate)
 */
router.get(
  '/commissions',
  protect,
  requireActiveAffiliate,
  ...validatePagination(),
  query('status').optional().isIn(['pending', 'approved', 'paid', 'rejected']),
  handleValidationErrors,
  getUserCommissions
);

/**
 * @route   GET /api/affiliates/commissions/:commissionId
 * @desc    Get specific commission details
 * @access  Private (Active Affiliate)
 */
router.get(
  '/commissions/:commissionId',
  protect,
  requireActiveAffiliate,
  validateMongoIdParam('commissionId'),
  handleValidationErrors,
  getCommissionById
);

/**
 * @route   POST /api/affiliates/payout/request
 * @desc    Request payout for earnings
 * @access  Private (Active Affiliate)
 * @rateLimit 3 requests/hour per user
 */
router.post(
  '/payout/request',
  protect,
  requireActiveAffiliate,
  ...validateRequestPayout(),
  handleValidationErrors,
  requestPayout
);

/**
 * @route   GET /api/affiliates/payouts
 * @desc    Get user's payout history
 * @access  Private (Active Affiliate)
 */
router.get(
  '/payouts',
  protect,
  requireActiveAffiliate,
  ...validatePagination(),
  handleValidationErrors,
  getUserPayouts
);

/**
 * @route   GET /api/affiliates/payouts/:payoutId
 * @desc    Get specific payout details
 * @access  Private (Active Affiliate)
 */
router.get(
  '/payouts/:payoutId',
  protect,
  requireActiveAffiliate,
  validateMongoIdParam('payoutId'),
  handleValidationErrors,
  getPayoutById
);

/**
 * @route   GET /api/affiliates/dashboard
 * @desc    Get comprehensive affiliate dashboard data
 * @access  Private (Active Affiliate)
 */
router.get(
  '/dashboard',
  protect,
  requireActiveAffiliate,
  getAffiliateDashboard
);

/**
 * @route   GET /api/affiliates/earnings
 * @desc    Get earnings summary and statistics
 * @access  Private (Active Affiliate)
 */
router.get(
  '/earnings',
  protect,
  requireActiveAffiliate,
  getEarningsSummary
);

// ======================
// ADMIN ROUTES
// ======================

/**
 * @route   PUT /api/affiliates/commission-rate
 * @desc    Update commission rate for any user (Admin only)
 * @access  Private (Admin)
 */
router.put(
  '/commission-rate',
  protect,
  validateAdminAccess,
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('commissionRate').isFloat({ min: 0, max: 50 }).withMessage('Rate must be 0-50%'),
  handleValidationErrors,
  updateCommissionRate
);

/**
 * @route   PUT /api/affiliates/:affiliateId/approve
 * @desc    Approve pending affiliate application
 * @access  Private (Admin)
 */
router.put(
  '/:affiliateId/approve',
  protect,
  validateAdminAccess,
  validateMongoIdParam('affiliateId'),
  handleValidationErrors,
  approveAffiliate
);

/**
 * @route   PUT /api/affiliates/:affiliateId/suspend
 * @desc    Suspend affiliate account
 * @access  Private (Admin)
 */
router.put(
  '/:affiliateId/suspend',
  protect,
  validateAdminAccess,
  validateMongoIdParam('affiliateId'),
  body('reason').trim().notEmpty().withMessage('Suspension reason required'),
  handleValidationErrors,
  suspendAffiliate
);

/**
 * @route   PUT /api/affiliates/:affiliateId/ban
 * @desc    Ban affiliate account permanently
 * @access  Private (Admin)
 */
router.put(
  '/:affiliateId/ban',
  protect,
  validateAdminAccess,
  validateMongoIdParam('affiliateId'),
  body('reason').trim().notEmpty().withMessage('Ban reason required'),
  handleValidationErrors,
  banAffiliate
);

/**
 * @route   GET /api/affiliates/admin/all
 * @desc    Get all affiliates with filtering/pagination
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  protect,
  validateAdminAccess,
  ...validatePagination(),
  query('status').optional().isIn(['pending', 'active', 'suspended', 'banned']),
  query('search').optional().trim().isLength({ min: 2, max: 100 }),
  handleValidationErrors,
  getAllAffiliates
);

/**
 * @route   GET /api/affiliates/admin/:affiliateId
 * @desc    Get specific affiliate details (Admin view)
 * @access  Private (Admin or Account Owner)
 */
router.get(
  '/admin/:affiliateId',
  protect,
  validateMongoIdParam('affiliateId'),
  handleValidationErrors,
  verifyAffiliateAccess,
  getAffiliateById
);

/**
 * @route   GET /api/affiliates/admin/leaderboard
 * @desc    Get top affiliates by earnings
 * @access  Private (Admin)
 */
router.get(
  '/admin/leaderboard',
  protect,
  validateAdminAccess,
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  getAffiliateLeaderboard
);

/**
 * @route   DELETE /api/affiliates/admin/:affiliateId
 * @desc    Delete affiliate account and related data
 * @access  Private (Admin)
 */
router.delete(
  '/admin/:affiliateId',
  protect,
  validateAdminAccess,
  validateMongoIdParam('affiliateId'),
  handleValidationErrors,
  deleteAffiliate
);

// ======================
// BULK ADMIN OPERATIONS
// ======================

/**
 * @route   POST /api/affiliates/admin/bulk/approve
 * @desc    Bulk approve pending affiliates
 * @access  Private (Admin)
 */
router.post(
  '/admin/bulk/approve',
  protect,
  validateAdminAccess,
  body('affiliateIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Provide 1-100 affiliate IDs'),
  body('affiliateIds.*').isMongoId().withMessage('Invalid affiliate ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const Affiliate = require('../models/Affiliate');
      const { affiliateIds } = req.body;

      // Filter out non-pending affiliates
      const pendingAffiliates = await Affiliate.find({
        _id: { $in: affiliateIds },
        status: 'pending'
      }).select('_id');

      if (pendingAffiliates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No pending affiliates found in selection'
        });
      }

      const result = await Affiliate.updateMany(
        { _id: { $in: pendingAffiliates.map(a => a._id) } },
        {
          $set: {
            status: 'active',
            approvedAt: new Date(),
            approvedBy: req.user.id,
            suspensionReason: '',
            suspendedAt: null
          }
        }
      );

      // Log approvals
      pendingAffiliates.forEach(aff => {
        console.log(`✅ Affiliate ${aff._id} approved by admin ${req.user.id}`);
      });

      res.json({ 
        success: true,
        message: `${result.modifiedCount} affiliates approved successfully`,
        processed: result.modifiedCount,
        skipped: affiliateIds.length - pendingAffiliates.length
      });
    } catch (error) {
      console.error('Bulk approve error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Bulk approval failed',
        error: error.message 
      });
    }
  }
);

/**
 * @route   POST /api/affiliates/admin/bulk/commission-rate
 * @desc    Bulk update commission rates
 * @access  Private (Admin)
 */
router.post(
  '/admin/bulk/commission-rate',
  protect,
  validateAdminAccess,
  body('affiliateIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Provide 1-100 affiliate IDs'),
  body('affiliateIds.*').isMongoId().withMessage('Invalid affiliate ID'),
  body('commissionRate')
    .isFloat({ min: 0, max: 50 })
    .withMessage('Rate must be between 0-50%'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const Affiliate = require('../models/Affiliate');
      const { affiliateIds, commissionRate } = req.body;
      const rate = parseFloat(commissionRate);

      const result = await Affiliate.updateMany(
        { _id: { $in: affiliateIds } },
        { $set: { commissionRate: rate } }
      );

      res.json({ 
        success: true,
        message: `${result.modifiedCount} affiliates updated successfully`,
        processed: result.modifiedCount
      });
    } catch (error) {
      console.error('Bulk commission update error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Bulk update failed',
        error: error.message 
      });
    }
  }
);

// ======================
// ERROR HANDLING
// ======================

// Handle 404 for affiliate routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Affiliate route not found',
    path: req.originalUrl
  });
});

// Global error handler for affiliate routes
router.use((err, req, res, next) => {
  console.error('Affiliate route error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    user: req.user?.id
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = router;
