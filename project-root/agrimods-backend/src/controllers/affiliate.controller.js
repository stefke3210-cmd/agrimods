// src/controllers/affiliate.controller.js
const Affiliate = require('../models/affiliate.model');
const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// @desc    Create affiliate application
// @route   POST /api/v1/affiliate/apply
// @access  Private
exports.applyForAffiliate = catchAsync(async (req, res, next) => {
  const { website, socialMedia, marketingPlan, expectedSales } = req.body;

  // Check if user already has an affiliate application
  const existingApplication = await Affiliate.findOne({ user: req.user.id });

  if (existingApplication) {
    return next(new AppError('You already have an affiliate application', 400));
  }

  const affiliate = await Affiliate.create({
    user: req.user.id,
    website,
    socialMedia,
    marketingPlan,
    expectedSales,
    status: 'pending'
  });

  res.status(201).json({
    status: 'success',
    message: 'Affiliate application submitted successfully',
    data: affiliate
  });
});

// @desc    Get current user's affiliate status
// @route   GET /api/v1/affiliate/status
// @access  Private
exports.getAffiliateStatus = catchAsync(async (req, res, next) => {
  const affiliate = await Affiliate.findOne({ user: req.user.id });

  if (!affiliate) {
    return next(new AppError('No affiliate application found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: affiliate
  });
});

// @desc    Get affiliate dashboard stats
// @route   GET /api/v1/affiliate/dashboard
// @access  Private (Affiliate only)
exports.getAffiliateDashboard = catchAsync(async (req, res, next) => {
  const affiliate = await Affiliate.findOne({ user: req.user.id });

  if (!affiliate) {
    return next(new AppError('No affiliate account found', 404));
  }

  if (affiliate.status !== 'approved') {
    return next(new AppError('Affiliate account not approved yet', 403));
  }

  // Calculate stats (you'll need to implement these based on your data model)
  const stats = {
    totalClicks: affiliate.totalClicks || 0,
    totalConversions: affiliate.totalConversions || 0,
    totalEarnings: affiliate.totalEarnings || 0,
    pendingEarnings: affiliate.pendingEarnings || 0,
    referralCode: affiliate.referralCode
  };

  res.status(200).json({
    status: 'success',
    data: stats
  });
});

// @desc    Get affiliate referral link
// @route   GET /api/v1/affiliate/link
// @access  Private (Affiliate only)
exports.getReferralLink = catchAsync(async (req, res, next) => {
  const affiliate = await Affiliate.findOne({ user: req.user.id });

  if (!affiliate) {
    return next(new AppError('No affiliate account found', 404));
  }

  if (affiliate.status !== 'approved') {
    return next(new AppError('Affiliate account not approved yet', 403));
  }

  const referralLink = `${process.env.FRONTEND_URL}/ref/${affiliate.referralCode}`;

  res.status(200).json({
    status: 'success',
    data: {
      referralLink,
      referralCode: affiliate.referralCode
    }
  });
});

// @desc    Get affiliate earnings history
// @route   GET /api/v1/affiliate/earnings
// @access  Private (Affiliate only)
exports.getEarningsHistory = catchAsync(async (req, res, next) => {
  const affiliate = await Affiliate.findOne({ user: req.user.id })
    .populate('earnings');

  if (!affiliate) {
    return next(new AppError('No affiliate account found', 404));
  }

  if (affiliate.status !== 'approved') {
    return next(new AppError('Affiliate account not approved yet', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      earnings: affiliate.earnings || [],
      totalEarnings: affiliate.totalEarnings || 0
    }
  });
});

// @desc    Request payout
// @route   POST /api/v1/affiliate/payout
// @access  Private (Affiliate only)
exports.requestPayout = catchAsync(async (req, res, next) => {
  const { amount, paymentMethod } = req.body;

  const affiliate = await Affiliate.findOne({ user: req.user.id });

  if (!affiliate) {
    return next(new AppError('No affiliate account found', 404));
  }

  if (affiliate.status !== 'approved') {
    return next(new AppError('Affiliate account not approved yet', 403));
  }

  if (amount > affiliate.pendingEarnings) {
    return next(new AppError('Insufficient earnings for payout', 400));
  }

  if (amount < 50) {
    return next(new AppError('Minimum payout amount is $50', 400));
  }

  // Create payout request (implement based on your model)
  affiliate.pendingEarnings -= amount;
  affiliate.totalWithdrawn += amount;
  await affiliate.save();

  res.status(200).json({
    status: 'success',
    message: 'Payout request submitted successfully',
    data: {
      amount,
      paymentMethod,
      newBalance: affiliate.pendingEarnings
    }
  });
});

// ==================== ADMIN ROUTES ====================

// @desc    Get all affiliate applications
// @route   GET /api/v1/affiliate/applications
// @access  Private (Admin only)
exports.getAllApplications = catchAsync(async (req, res, next) => {
  const applications = await Affiliate.find()
    .populate('user', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: applications.length,
    data: applications
  });
});

// @desc    Approve/reject affiliate application
// @route   PATCH /api/v1/affiliate/applications/:id
// @access  Private (Admin only)
exports.updateApplication = catchAsync(async (req, res, next) => {
  const { status, rejectionReason } = req.body;

  const affiliate = await Affiliate.findById(req.params.id);

  if (!affiliate) {
    return next(new AppError('Application not found', 404));
  }

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  affiliate.status = status;
  if (rejectionReason) {
    affiliate.rejectionReason = rejectionReason;
  }

  // Generate referral code if approved
  if (status === 'approved') {
    affiliate.referralCode = `AFF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  await affiliate.save();

  res.status(200).json({
    status: 'success',
    message: `Application ${status}`,
    data: affiliate
  });
});
