// src/controllers/mod.controller.js
const Mod = require('../models/Mod.model');
// ✅ FIX 1: Correct case for Category import (or remove if unused)
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// @desc    Get all mods
// @route   GET /api/v1/mods
// @access  Public
exports.getAllMods = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  
  if (req.query.category) query.category = req.query.category;
  if (req.query.gameVersion) query.gameVersion = req.query.gameVersion;
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: 'i' };
  }
  if (!req.user || !req.user.isAdmin) {
    query.status = 'approved';
  }

  const mods = await Mod.find(query)
    .populate('author', 'name username')
    .populate('category', 'name')
    .sort('-createdAt')
    .limit(limit)
    .skip(skip);

  const total = await Mod.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: mods.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    data: mods
  });
});

// @desc    Get single mod
// @route   GET /api/v1/mods/:id
// @access  Public
exports.getMod = catchAsync(async (req, res, next) => {
  const mod = await Mod.findById(req.params.id)
    .populate('author', 'name username avatar')
    .populate('category', 'name')
    .populate('reviews');

  if (!mod) {
    return next(new AppError('Mod not found', 404, 'MOD_NOT_FOUND'));
  }

  if (mod.status !== 'approved' && 
      (!req.user || (req.user.id !== mod.author._id.toString() && !req.user.isAdmin))) {
    return next(new AppError('You don\'t have access to this mod', 403, 'ACCESS_DENIED'));
  }

  mod.downloads += 1;
  await mod.save();

  res.status(200).json({
    status: 'success',
    data: mod
  });
});

// @desc    Create new mod
// @route   POST /api/v1/mods
// @access  Private
exports.createMod = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a mod file', 400, 'NO_FILE'));
  }

  const { name, description, category, gameVersion, tags } = req.body;

  if (!name || !description || !category || !gameVersion) {
    return next(new AppError('Please provide all required fields', 400, 'MISSING_FIELDS'));
  }

  const mod = await Mod.create({
    name,
    description,
    category,
    gameVersion,
    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    file: {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    },
    author: req.user.id,
    status: 'pending_review'
  });

  res.status(201).json({
    status: 'success',
    message: 'Mod submitted for review',
    data: mod
  });
});

// @desc    Update mod
// @route   PATCH /api/v1/mods/:id
// @access  Private (Author or Admin)
exports.updateMod = catchAsync(async (req, res, next) => {
  const mod = await Mod.findById(req.params.id);

  if (!mod) {
    return next(new AppError('Mod not found', 404, 'MOD_NOT_FOUND'));
  }

  if (mod.author._id.toString() !== req.user.id && !req.user.isAdmin) {
    return next(new AppError('You don\'t have permission to update this mod', 403, 'ACCESS_DENIED'));
  }

  if (req.file) {
    req.body.file = {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    };
  }

  const updatedMod = await Mod.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: updatedMod
  });
});

// @desc    Delete mod
// @route   DELETE /api/v1/mods/:id
// @access  Private (Author or Admin)
exports.deleteMod = catchAsync(async (req, res, next) => {
  const mod = await Mod.findById(req.params.id);

  if (!mod) {
    return next(new AppError('Mod not found', 404, 'MOD_NOT_FOUND'));
  }

  if (mod.author._id.toString() !== req.user.id && !req.user.isAdmin) {
    return next(new AppError('You don\'t have permission to delete this mod', 403, 'ACCESS_DENIED'));
  }

  await Mod.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    message: 'Mod deleted successfully'
  });
});

// @desc    Download mod
// @route   GET /api/v1/mods/:id/download
// @access  Public
exports.downloadMod = catchAsync(async (req, res, next) => {
  const mod = await Mod.findById(req.params.id);

  if (!mod) {
    return next(new AppError('Mod not found', 404, 'MOD_NOT_FOUND'));
  }

  if (mod.status !== 'approved') {
    return next(new AppError('Mod is not available for download', 403, 'MOD_NOT_PUBLISHED'));
  }

  mod.downloads += 1;
  await mod.save();

  // ⚠️ Note: On Render, files are ephemeral. Consider using S3/Cloudinary for production.
  res.download(mod.file.path, mod.file.filename);
});

// @desc    Rate mod
// @route   POST /api/v1/mods/:id/rate
// @access  Private
exports.rateMod = catchAsync(async (req, res, next) => {
  const { rating, review } = req.body;

  const mod = await Mod.findById(req.params.id);

  if (!mod) {
    return next(new AppError('Mod not found', 404, 'MOD_NOT_FOUND'));
  }

  const existingReview = mod.reviews?.find(r => r.user?.toString() === req.user.id);

  if (existingReview) {
    return next(new AppError('You already rated this mod', 400, 'ALREADY_REVIEWED'));
  }

  mod.reviews = mod.reviews || [];
  mod.reviews.push({
    user: req.user.id,
    rating: parseInt(rating),
    title: review?.substring(0, 100) || '',
    comment: review,
    createdAt: new Date()
  });

  const totalRating = mod.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  mod.ratingsAverage = totalRating / mod.reviews.length;
  mod.ratingsQuantity = mod.reviews.length;

  await mod.save();

  res.status(200).json({
    status: 'success',
    message: 'Review added successfully',
    data: {
      rating,
      review,
      averageRating: mod.ratingsAverage
    }
  });
});

// ✅ FIX 2: ADD MISSING addScreenshots FUNCTION
// @desc    Add screenshots to mod
// @route   POST /api/v1/mods/:id/screenshots
// @access  Private (Author or Admin)
exports.addScreenshots = catchAsync(async (req, res, next) => {
  const mod = await Mod.findById(req.params.id);

  if (!mod) {
    return next(new AppError('Mod not found', 404, 'MOD_NOT_FOUND'));
  }

  if (mod.author._id.toString() !== req.user.id && !req.user.isAdmin) {
    return next(new AppError('You don\'t have permission to update this mod', 403, 'ACCESS_DENIED'));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one image', 400, 'NO_FILES'));
  }

  const screenshots = req.files.map(file => ({
    url: file.path,
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype
  }));

  mod.screenshots = mod.screenshots || [];
  mod.screenshots.push(...screenshots);
  await mod.save();

  res.status(200).json({
    status: 'success',
    message: 'Screenshots added successfully',
    data: { screenshots: mod.screenshots }
  });
});

// ==================== ADMIN ROUTES ====================

// @desc    Get all mods (including pending)
// @route   GET /api/v1/mods/admin/all
// @access  Private (Admin only)
exports.getAllModsAdmin = catchAsync(async (req, res, next) => {
  const mods = await Mod.find()
    .populate('author', 'name email')
    .populate('category', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: mods.length,
    data: mods
  });
});

// @desc    Approve/reject mod
// @route   PATCH /api/v1/mods/admin/:id/status
// @access  Private (Admin only)
exports.updateModStatus = catchAsync(async (req, res, next) => {
  const { status, rejectionReason } = req.body;

  const mod = await Mod.findById(req.params.id);

  if (!mod) {
    return next(new AppError('Mod not found', 404, 'MOD_NOT_FOUND'));
  }

  if (!['approved', 'rejected', 'pending_review', 'published'].includes(status)) {
    return next(new AppError('Invalid status', 400, 'INVALID_STATUS'));
  }

  mod.status = status;
  if (rejectionReason) mod.rejectionReason = rejectionReason;
  if (status === 'approved' && !mod.publishedAt) mod.publishedAt = new Date();

  await mod.save();

  res.status(200).json({
    status: 'success',
    message: `Mod ${status}`,
    data: mod
  });
});

// @desc    Get mod statistics
// @route   GET /api/v1/mods/admin/stats
// @access  Private (Admin only)
exports.getModStats = catchAsync(async (req, res, next) => {
  const totalMods = await Mod.countDocuments();
  const approvedMods = await Mod.countDocuments({ status: 'approved' });
  const pendingMods = await Mod.countDocuments({ status: 'pending_review' });
  const rejectedMods = await Mod.countDocuments({ status: 'rejected' });

  const totalDownloads = await Mod.aggregate([
    { $group: { _id: null, total: { $sum: '$downloads' } } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalMods,
      approvedMods,
      pendingMods,
      rejectedMods,
      totalDownloads: totalDownloads[0]?.total || 0
    }
  });
});

