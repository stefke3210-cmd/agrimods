// src/routes/mod.routes.js
const express = require('express');
const router = express.Router();
const modController = require('../controllers/mod.controller');
const { protect } = require('../controllers/auth.controller');
const { restrictTo } = require('../controllers/auth.controller');

// ✅ IMPORT UPLOAD MIDDLEWARE - ONLY ONCE!
const { 
  uploadMod, 
  uploadImages, 
  handleMulterError,
  requireFile 
} = require('../middleware/upload.middleware');

// ==================== PUBLIC ROUTES ====================

// @route   GET /api/v1/mods
// @desc    Get all mods
// @access  Public
router.get('/', modController.getAllMods);

// @route   GET /api/v1/mods/:id
// @desc    Get single mod
// @access  Public
router.get('/:id', modController.getMod);

// @route   GET /api/v1/mods/:id/download
// @desc    Download mod
// @access  Public
router.get('/:id/download', modController.downloadMod);

// @route   POST /api/v1/mods/:id/rate
// @desc    Rate mod
// @access  Private
router.post('/:id/rate', protect, modController.rateMod);

// ==================== PROTECTED ROUTES ====================

// @route   POST /api/v1/mods
// @desc    Create new mod
// @access  Private
router.post('/', 
  protect, 
  uploadMod, 
  handleMulterError, 
  requireFile, 
  modController.createMod
);

// @route   PATCH /api/v1/mods/:id
// @desc    Update mod
// @access  Private (Author or Admin)
router.patch('/:id', 
  protect, 
  uploadMod, 
  handleMulterError, 
  modController.updateMod
);

// @route   DELETE /api/v1/mods/:id
// @desc    Delete mod
// @access  Private (Author or Admin)
router.delete('/:id', protect, modController.deleteMod);

// @route   POST /api/v1/mods/:id/screenshots
// @desc    Upload mod screenshots
// @access  Private (Author or Admin)
router.post('/:id/screenshots', 
  protect, 
  uploadImages, 
  handleMulterError, 
  modController.addScreenshots
);

// ==================== ADMIN ROUTES ====================

// @route   GET /api/v1/mods/admin/all
// @desc    Get all mods (including pending)
// @access  Private (Admin only)
router.get('/admin/all', protect, restrictTo('admin', 'staff'), modController.getAllModsAdmin);

// @route   PATCH /api/v1/mods/admin/:id/status
// @desc    Approve/reject mod
// @access  Private (Admin only)
router.patch('/admin/:id/status', protect, restrictTo('admin'), modController.updateModStatus);

// @route   GET /api/v1/mods/admin/stats
// @desc    Get mod statistics
// @access  Private (Admin only)
router.get('/admin/stats', protect, restrictTo('admin', 'staff'), modController.getModStats);

module.exports = router;
