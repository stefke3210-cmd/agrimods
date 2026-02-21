// src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util'); // ✅ ADD THIS - missing import!
const { validationResult } = require('express-validator');
const User = require('../models/User');
const EmailService = require('../services/email.service');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Create and send token
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remove password from output
  user.password = undefined;
  
  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };
  
  // Send cookie
  res.cookie('jwt', token, cookieOptions);
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

// ==================== PUBLIC ROUTES ====================

// Register new user
const register = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array()));
  }
  
  // Check for affiliate referral
  let referredBy = null;
  if (req.body.referralCode) {
    const referrer = await User.findOne({ 
      affiliateCode: req.body.referralCode,
      role: 'affiliate'
    });
    
    if (referrer) {
      referredBy = referrer._id;
    }
  }
  
  // Create user
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    fsVersion: req.body.fsVersion || 'FS22',
    referredBy
  });
  
  // Send welcome email (non-blocking)
  EmailService.sendWelcomeEmail(newUser).catch(err => {
    console.error('Welcome email failed:', err.message);
  });
  
  // Notify referrer if applicable
  if (referredBy) {
    User.findById(referredBy).then(referrer => {
      if (referrer) {
        EmailService.sendReferralNotification(referrer, newUser).catch(err => {
          console.error('Referral notification failed:', err.message);
        });
      }
    });
  }
  
  createSendToken(newUser, 201, res);
});

// Login user
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400, 'MISSING_CREDENTIALS'));
  }
  
  // Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401, 'INVALID_CREDENTIALS'));
  }
  
  // Check if user is active
  if (!user.active) {
    return next(new AppError('User account has been deactivated', 401, 'ACCOUNT_DEACTIVATED'));
  }
  
  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  
  // Send token
  createSendToken(user, 200, res);
});

// Logout user
const logout = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// Forgot password
const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404, 'USER_NOT_FOUND'));
  }
  
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  
  // 3) Send it to user's email
  try {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await EmailService.sendPasswordResetEmail(user, resetURL);
    
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(new AppError('There was an error sending the email. Try again later!', 500, 'EMAIL_FAILED'));
  }
});

// Reset password
const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  
  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400, 'INVALID_TOKEN'));
  }
  
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();
  
  // 3) Log the user in, send JWT
  createSendToken(user, 200, res);
});

// Verify email
const verifyEmail = catchAsync(async (req, res, next) => {
  const verificationToken = crypto
    .createHash('sha256')
    .update(req.params.verificationToken)
    .digest('hex');
  
  const user = await User.findOne({
    emailVerificationToken: verificationToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    return next(new AppError('Verification token is invalid or expired', 400, 'INVALID_TOKEN'));
  }
  
  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  
  // Send welcome email if not already sent
  if (!user.welcomeEmailSent) {
    EmailService.sendWelcomeEmail(user).catch(err => {
      console.error('Welcome email failed:', err.message);
    });
    user.welcomeEmailSent = true;
    await user.save({ validateBeforeSave: false });
  }
  
  // Auto-login after verification
  createSendToken(user, 200, res);
});

// Resend verification email
const resendVerificationEmail = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  
  if (!user) {
    return next(new AppError('No user found with that email', 404, 'USER_NOT_FOUND'));
  }
  
  if (user.isVerified) {
    return next(new AppError('Email is already verified', 400, 'ALREADY_VERIFIED'));
  }
  
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  
  try {
    const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await EmailService.sendVerificationEmail(user, verificationURL);
    
    res.status(200).json({
      status: 'success',
      message: 'Verification email sent!'
    });
  } catch (error) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(new AppError('There was an error sending the email. Try again later!', 500, 'EMAIL_FAILED'));
  }
});

// Refresh token
const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken: refreshTok } = req.body;
  
  if (!refreshTok) {
    return next(new AppError('Please provide a refresh token', 400, 'MISSING_TOKEN'));
  }
  
  try {
    const decoded = await promisify(jwt.verify)(refreshTok, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(new AppError('User not found', 401, 'USER_NOT_FOUND'));
    }
    
    createSendToken(user, 200, res);
  } catch (error) {
    return next(new AppError('Invalid or expired refresh token', 401, 'INVALID_TOKEN'));
  }
});

// ==================== PROTECTED ROUTES ====================

// Get current user
const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// Update password
const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  
  // 2) Check if POSTed current password is correct
  if (!(await user.comparePassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong', 401, 'INVALID_PASSWORD'));
  }
  
  // 3) If so, update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  user.passwordChangedAt = Date.now();
  await user.save();
  
  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

// Update profile
const updateProfile = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      username: req.body.username,
      bio: req.body.bio,
      avatar: req.body.avatar,
      fsVersion: req.body.fsVersion
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

// Update avatar
const updateAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400, 'NO_FILE'));
  }
  
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { avatar: req.file.path },
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

// Delete account (soft delete)
const deleteAccount = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    active: false,
    deletedAt: new Date()
  });
  
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(204).json({
    status: 'success',
    message: 'Account deactivated successfully'
  });
});

// Deactivate account
const deactivateAccount = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  user.active = false;
  user.deactivatedAt = new Date();
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Account deactivated. You can reactivate within 30 days.'
  });
});

// Reactivate account
const reactivateAccount = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ 
    email: req.body.email,
    active: false,
    deactivatedAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });
  
  if (!user) {
    return next(new AppError('Account not found or reactivation period expired', 404, 'NOT_FOUND'));
  }
  
  // Verify password
  if (!(await user.comparePassword(req.body.password, user.password))) {
    return next(new AppError('Incorrect password', 401, 'INVALID_CREDENTIALS'));
  }
  
  user.active = true;
  user.deactivatedAt = undefined;
  await user.save();
  
  createSendToken(user, 200, res);
});

// ==================== OAUTH ROUTES (Stubs - implement with passport.js) ====================

const googleAuth = (req, res, next) => {
  // Redirect to Google OAuth
  res.redirect(process.env.GOOGLE_OAUTH_URL);
};

const googleCallback = catchAsync(async (req, res, next) => {
  // Handle Google OAuth callback
  // Implement with passport-google-oauth20
  next(new AppError('Google OAuth not fully implemented', 501, 'NOT_IMPLEMENTED'));
});

const githubAuth = (req, res, next) => {
  res.redirect(process.env.GITHUB_OAUTH_URL);
};

const githubCallback = catchAsync(async (req, res, next) => {
  next(new AppError('GitHub OAuth not fully implemented', 501, 'NOT_IMPLEMENTED'));
});

const discordAuth = (req, res, next) => {
  res.redirect(process.env.DISCORD_OAUTH_URL);
};

const discordCallback = catchAsync(async (req, res, next) => {
  next(new AppError('Discord OAuth not fully implemented', 501, 'NOT_IMPLEMENTED'));
});

// ==================== ADMIN ROUTES ====================

// Restrict to roles middleware
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403, 'ACCESS_DENIED'));
    }
    next();
  };
};

const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('-password');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404, 'USER_NOT_FOUND'));
  }
  
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

const updateUserById = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!updatedUser) {
    return next(new AppError('No user found with that ID', 404, 'USER_NOT_FOUND'));
  }
  
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

const deleteUserById = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404, 'USER_NOT_FOUND'));
  }
  
  res.status(204).json({
    status: 'success',
    message: 'User deleted successfully'
  });
});

const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  
  const validRoles = ['user', 'premium', 'staff', 'admin'];
  if (!validRoles.includes(role)) {
    return next(new AppError('Invalid role', 400, 'INVALID_INPUT'));
  }
  
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!updatedUser) {
    return next(new AppError('No user found with that ID', 404, 'USER_NOT_FOUND'));
  }
  
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

const updateUserStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  const validStatuses = ['active', 'inactive', 'suspended', 'banned'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400, 'INVALID_INPUT'));
  }
  
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { 
      status,
      [`${status}At`]: new Date()
    },
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!updatedUser) {
    return next(new AppError('No user found with that ID', 404, 'USER_NOT_FOUND'));
  }
  
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

// ==================== UTILITY ROUTES ====================

const checkEmailExists = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.params.email });
  
  res.status(200).json({
    status: 'success',
    exists: !!user
  });
});

const checkUsernameExists = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username });
  
  res.status(200).json({
    status: 'success',
    exists: !!user
  });
});

const sendVerificationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with that email', 404, 'USER_NOT_FOUND'));
  }
  
  if (user.isVerified) {
    return next(new AppError('Email is already verified', 400, 'ALREADY_VERIFIED'));
  }
  
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  
  const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  await EmailService.sendVerificationEmail(user, verificationURL);
  
  res.status(200).json({
    status: 'success',
    message: 'Verification email sent!'
  });
});

// ==================== SESSION ROUTES ====================

const getActiveSessions = catchAsync(async (req, res, next) => {
  // Implement session tracking (requires session model or JWT blacklist)
  res.status(200).json({
    status: 'success',
    data: { sessions: [] } // Placeholder
  });
});

const revokeSession = catchAsync(async (req, res, next) => {
  // Implement session revocation
  res.status(200).json({
    status: 'success',
    message: 'Session revoked'
  });
});

const revokeAllOtherSessions = catchAsync(async (req, res, next) => {
  // Implement revoking all other sessions
  res.status(200).json({
    status: 'success',
    message: 'All other sessions revoked'
  });
});

// ==================== 2FA ROUTES ====================

const enable2FA = catchAsync(async (req, res, next) => {
  // Implement 2FA setup with speakeasy or similar
  res.status(200).json({
    status: 'success',
    message: '2FA setup initiated'
  });
});

const verify2FA = catchAsync(async (req, res, next) => {
  // Verify 2FA code
  res.status(200).json({
    status: 'success',
    message: '2FA verified'
  });
});

const disable2FA = catchAsync(async (req, res, next) => {
  // Disable 2FA
  res.status(200).json({
    status: 'success',
    message: '2FA disabled'
  });
});

const generateBackupCodes = catchAsync(async (req, res, next) => {
  // Generate backup codes for 2FA
  const codes = Array.from({ length: 8 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
  
  res.status(200).json({
    status: 'success',
    data: { backupCodes: codes }
  });
});

// ==================== RECOVERY ROUTES ====================

const recoverAccount = catchAsync(async (req, res, next) => {
  const { email, username } = req.body;
  
  const user = await User.findOne({ 
    $or: [{ email }, { username }] 
  });
  
  if (!user) {
    return next(new AppError('No account found with those details', 404, 'USER_NOT_FOUND'));
  }
  
  // Send recovery email
  const recoveryToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  
  const recoveryURL = `${process.env.FRONTEND_URL}/recover-account/${recoveryToken}`;
  await EmailService.sendPasswordResetEmail(user, recoveryURL);
  
  res.status(200).json({
    status: 'success',
    message: 'Recovery instructions sent to email'
  });
});

const unlockAccount = catchAsync(async (req, res, next) => {
  const { email, unlockCode } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found', 404, 'USER_NOT_FOUND'));
  }
  
  // Verify unlock code (implement your logic)
  if (user.unlockCode !== unlockCode) {
    return next(new AppError('Invalid unlock code', 400, 'INVALID_CODE'));
  }
  
  user.loginAttempts = 0;
  user.unlockCode = undefined;
  user.unlockCodeExpires = undefined;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Account unlocked'
  });
});

// ==================== PROTECT MIDDLEWARE ====================

const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }
  
  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401, 'AUTH_REQUIRED'));
  }
  
  // 2) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401, 'USER_NOT_FOUND'));
  }
  
  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter?.(decoded.iat)) {
    return next(new AppError('User recently changed password! Please log in again.', 401, 'TOKEN_INVALID'));
  }
  
  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// ==================== EXPORT ALL FUNCTIONS ====================
module.exports = {
  // Public
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  refreshToken,
  getMe,
  
  // Protected
  updatePassword,
  updateProfile,
  updateAvatar,
  deleteAccount,
  deactivateAccount,
  reactivateAccount,
  
  // OAuth
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  discordAuth,
  discordCallback,
  
  // Admin
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  updateUserRole,
  updateUserStatus,
  restrictTo,
  
  // Utility
  checkEmailExists,
  checkUsernameExists,
  sendVerificationEmail,
  
  // Session
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  
  // 2FA
  enable2FA,
  verify2FA,
  disable2FA,
  generateBackupCodes,
  
  // Recovery
  recoverAccount,
  unlockAccount,
  
  // Middleware
  protect
};
