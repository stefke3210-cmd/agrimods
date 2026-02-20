const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) return next(new AppError('Not logged in', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    
    if (!user || !user.active) return next(new AppError('User no longer exists', 401));
    if (user.changedPasswordAfter(decoded.iat)) return next(new AppError('Password changed recently', 401));

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Invalid token', 401));
  }
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
  next();
};