// src/controllers/mod.controller.js
const Mod = require('../models/mod.model');
const Category = require('../models/category.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/mods/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `mod-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.zip', '.jar', '.mod', '.mcpack'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Allowed: .zip, .jar, .mod, .mcpack', 400), false);
    }
  }
});

exports.uploadMiddleware = upload.single('modFile');

// @desc    Get all mods
// @route   GET /api/v1/mods
// @access  Public
exports.getAllMods = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  
  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }
  
  // Filter by game version
  if (req.query.gameVersion) {
    query.gameVersion = req.query.gameVersion;
  }
  
  // Search by name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: 'i' };
  }
  
  // Only show approved mods for public
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
    return next(new AppError('Mod not found', 404));
  }

  // Check if user has access (approved or is author/admin)
  if (mod.status !== 'approved' && 
      (!req.user || (req.user.id !== mod.author._id.toString() && !req.user.isAdmin))) {
    return next(new AppError('You don\'t have access to this mod', 403));
  }

  // Increment download count
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
  // Check if file was uploaded
  if (!req.file) {
    return next(new AppError('Please upload a mod file', 400));
  }

  const { name, description, category, gameVersion, tags } = req.body;

  // Validate required fields
  if (!name || !description || !category || !gameVersion) {
    return next(new AppError('Please provide all required fields', 400));
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
      size: req.file.size
    },
    author: req.user.id,
    status: 'pending' // Requires admin approval
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
    return next(new AppError('Mod not found', 404));
  }

  // Check if user is author or admin
  if (mod.author._id.toString() !== req.user.id && !req.user.isAdmin) {
    return next(new AppError('You don\'t have permission to update this mod', 403));
  }

  // Handle file update if new file uploaded
  if (req.file) {
    req.body.file = {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
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
    return next(new AppError('Mod not found', 404));
  }

  // Check if user is author or admin
  if (mod.author._id.toString() !== req.user.id && !req.user.isAdmin) {
    return next(new AppError('You don\'t have permission to delete this mod', 403));
  }

  await Mod.findByIdAndDelete(req.params.id);

  // TODO: Delete the actual file from storage

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
    return next(new AppError('Mod not found', 404));
  }

  if (mod.status !== 'approved') {
    return next(new AppError('Mod is not available for download', 403));
  }

  // Increment download count
  mod.downloads += 1;
  await mod.save();

  res.download(mod.file.path, mod.file.filename);
});

// @desc    Rate mod
// @route   POST /api/v1/mods/:id/rate
// @access  Private
exports.rateMod = catchAsync(async (req, res, next) => {
  const { rating, review } = req.body;

  const mod = await Mod.findById(req.params.id);

  if (!mod) {
    return next(new AppError('Mod not found', 404));
  }

  // Check if user already rated
  const existingReview = mod.reviews.find(
    r => r.user.toString() === req.user.id
  );

  if (existingReview) {
    return next(new AppError('You already rated this mod', 400));
  }

  // Add review (implement based on your model)
  mod.reviews.push({
    user: req.user.id,
    rating,
    review,
    createdAt: new Date()
  });

  // Calculate average rating
  const totalRating = mod.reviews.reduce((sum, r) => sum + r.rating, 0);
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
    return next(new AppError('Mod not found', 404));
  }

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  mod.status = status;
  if (rejectionReason) {
    mod.rejectionReason = rejectionReason;
  }

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
  const pendingMods = await Mod.countDocuments({ status: 'pending' });
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
