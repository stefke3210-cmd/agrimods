// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../controllers/auth.controller');
const { uploadAvatar } = require('../middleware/upload.middleware');
const { handleMulterError } = require('../middleware/upload.middleware');

// ==================== PUBLIC ROUTES ====================

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   POST /api/v1/auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', authController.logout);

// @route   POST /api/v1/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   PUT /api/v1/auth/reset-password/:resetToken
// @desc    Reset password with token
// @access  Public
router.put('/reset-password/:resetToken', authController.resetPassword);

// @route   GET /api/v1/auth/verify-email/:verificationToken
// @desc    Verify email address
// @access  Public
router.get('/verify-email/:verificationToken', authController.verifyEmail);

// @route   POST /api/v1/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', authController.resendVerificationEmail);

// @route   POST /api/v1/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post('/refresh-token', authController.refreshToken);

// @route   GET /api/v1/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, authController.getMe);

// ==================== PROTECTED ROUTES ====================

// @route   PUT /api/v1/auth/update-password
// @desc    Update current user's password
// @access  Private
router.put('/update-password', protect, authController.updatePassword);

// @route   PUT /api/v1/auth/update-profile
// @desc    Update current user's profile
// @access  Private
router.put('/update-profile', protect, authController.updateProfile);

// @route   PUT /api/v1/auth/update-avatar
// @desc    Update current user's avatar
// @access  Private
router.put('/update-avatar', 
  protect, 
  uploadAvatar, 
  handleMulterError, 
  authController.updateAvatar
);

// @route   DELETE /api/v1/auth/delete-account
// @desc    Delete current user's account
// @access  Private
router.delete('/delete-account', protect, authController.deleteAccount);

// @route   POST /api/v1/auth/deactivate-account
// @desc    Deactivate current user's account (soft delete)
// @access  Private
router.post('/deactivate-account', protect, authController.deactivateAccount);

// @route   POST /api/v1/auth/reactivate-account
// @desc    Reactivate deactivated account
// @access  Private (within 30 days of deactivation)
router.post('/reactivate-account', authController.reactivateAccount);

// ==================== OAUTH ROUTES ====================

// @route   GET /api/v1/auth/google
// @desc    Initiate Google OAuth login
// @access  Public
router.get('/google', authController.googleAuth);

// @route   GET /api/v1/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', authController.googleCallback);

// @route   GET /api/v1/auth/github
// @desc    Initiate GitHub OAuth login
// @access  Public
router.get('/github', authController.githubAuth);

// @route   GET /api/v1/auth/github/callback
// @desc    GitHub OAuth callback
// @access  Public
router.get('/github/callback', authController.githubCallback);

// @route   GET /api/v1/auth/discord
// @desc    Initiate Discord OAuth login
// @access  Public
router.get('/discord', authController.discordAuth);

// @route   GET /api/v1/auth/discord/callback
// @desc    Discord OAuth callback
// @access  Public
router.get('/discord/callback', authController.discordCallback);

// ==================== ADMIN ROUTES ====================

// @route   GET /api/v1/auth/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/users', protect, authController.restrictTo('admin', 'staff'), authController.getAllUsers);

// @route   GET /api/v1/auth/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private/Admin
router.get('/users/:id', protect, authController.restrictTo('admin', 'staff'), authController.getUserById);

// @route   PUT /api/v1/auth/users/:id
// @desc    Update user by ID (Admin only)
// @access  Private/Admin
router.put('/users/:id', protect, authController.restrictTo('admin', 'staff'), authController.updateUserById);

// @route   DELETE /api/v1/auth/users/:id
// @desc    Delete user by ID (Admin only)
// @access  Private/Admin
router.delete('/users/:id', protect, authController.restrictTo('admin', 'staff'), authController.deleteUserById);

// @route   PUT /api/v1/auth/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private/Admin
router.put('/users/:id/role', protect, authController.restrictTo('admin'), authController.updateUserRole);

// @route   PUT /api/v1/auth/users/:id/status
// @desc    Update user status (ban/unban) (Admin only)
// @access  Private/Admin
router.put('/users/:id/status', protect, authController.restrictTo('admin'), authController.updateUserStatus);

// ==================== UTILITY ROUTES ====================

// @route   GET /api/v1/auth/check-email/:email
// @desc    Check if email is already registered
// @access  Public
router.get('/check-email/:email', authController.checkEmailExists);

// @route   GET /api/v1/auth/check-username/:username
// @desc    Check if username is already taken
// @access  Public
router.get('/check-username/:username', authController.checkUsernameExists);

// @route   POST /api/v1/auth/send-verification
// @desc    Send verification email to specific email
// @access  Public (Rate limited)
router.post('/send-verification', authController.sendVerificationEmail);

// ==================== SESSION ROUTES ====================

// @route   GET /api/v1/auth/sessions
// @desc    Get all active sessions for current user
// @access  Private
router.get('/sessions', protect, authController.getActiveSessions);

// @route   DELETE /api/v1/auth/sessions/:sessionId
// @desc    Revoke specific session
// @access  Private
router.delete('/sessions/:sessionId', protect, authController.revokeSession);

// @route   DELETE /api/v1/auth/sessions
// @desc    Revoke all other sessions (keep current)
// @access  Private
router.delete('/sessions', protect, authController.revokeAllOtherSessions);

// ==================== TWO-FACTOR AUTH ROUTES ====================

// @route   POST /api/v1/auth/2fa/enable
// @desc    Enable 2FA for current user
// @access  Private
router.post('/2fa/enable', protect, authController.enable2FA);

// @route   POST /api/v1/auth/2fa/verify
// @desc    Verify 2FA code
// @access  Private
router.post('/2fa/verify', protect, authController.verify2FA);

// @route   POST /api/v1/auth/2fa/disable
// @desc    Disable 2FA for current user
// @access  Private
router.post('/2fa/disable', protect, authController.disable2FA);

// @route   GET /api/v1/auth/2fa/backup-codes
// @desc    Generate backup codes for 2FA
// @access  Private
router.get('/2fa/backup-codes', protect, authController.generateBackupCodes);

// ==================== ACCOUNT RECOVERY ====================

// @route   POST /api/v1/auth/recover-account
// @desc    Recover account with email and username
// @access  Public
router.post('/recover-account', authController.recoverAccount);

// @route   POST /api/v1/auth/unlock-account
// @desc    Unlock account after too many failed login attempts
// @access  Public
router.post('/unlock-account', authController.unlockAccount);

module.exports = router;
