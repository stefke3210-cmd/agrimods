// src/app.js
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// ✅ IMPORT CONSTANTS
const { 
  HTTP_STATUS, 
  RATE_LIMIT, 
  JWT, 
  PAGINATION,
  FILE_UPLOAD
} = require('./utils/constants');
const AppError = require('./utils/appError');

// Import routes
const authRoutes = require('./routes/auth.routes');
const modRoutes = require('./routes/mod.routes');
const paymentRoutes = require('./routes/payment.routes');
const supportRoutes = require('./routes/support.routes');
const affiliateRoutes = require('./routes/affiliate.routes');
const downloadRoutes = require('./routes/download.routes');

// Import middleware
const { protect } = require('./controllers/auth.controller');
const globalErrorHandler = require('./controllers/error.controller');

// ==================== 1. GLOBAL MIDDLEWARES ====================

// Set security HTTP headers
app.use(helmet());

// Enable CORS - using constants where applicable
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: HTTP_STATUS.OK // ✅ Using constant
}));

// Rate limiting - using constants
const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX || RATE_LIMIT.GENERAL.MAX, // ✅ Using constant
  windowMs: process.env.RATE_LIMIT_WINDOW || RATE_LIMIT.GENERAL.WINDOW_MS, // ✅ Using constant
  message: {
    status: HTTP_STATUS.TOO_MANY_REQUESTS, // ✅ Using constant
    message: 'Too many requests from this IP, please try again in 15 minutes!'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body - using constants for limits
app.use(express.json({ limit: process.env.JSON_LIMIT || '10kb' }));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.URL_ENCODED_LIMIT || '10kb' 
}));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution - using constants for whitelist if needed
app.use(hpp({
  whitelist: [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price',
    // Add more from constants if needed
  ]
}));

// Compress responses
app.use(compression());

// Serve static files - using constants for upload paths if needed
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== 2. ROUTES ====================

// Public routes
app.use('/api/v1/auth', authRoutes);

// Protected routes
app.use('/api/v1/mods', modRoutes);
app.use('/api/v1/payment', protect, paymentRoutes);
app.use('/api/v1/support', protect, supportRoutes);
app.use('/api/v1/affiliate', protect, affiliateRoutes);
app.use('/api/v1/download', protect, downloadRoutes);

// Health check route - using constants
app.get('/api/health', (req, res) => {
  res.status(HTTP_STATUS.OK).json({ // ✅ Using constant
    status: 'success',
    message: 'AgriMods API is operational',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1'
  });
});

// ==================== 3. ERROR HANDLING ====================

// Handle 404 - using constants
app.all('*', (req, res, next) => {
  next(new AppError(
    `Can't find ${req.originalUrl} on this server!`, 
    HTTP_STATUS.NOT_FOUND // ✅ Using constant
  ));
});

// Global error handler
app.use(globalErrorHandler);

// ==================== 4. OPTIONAL: Add Constants-Based Helpers ====================

// Helper: Add pagination headers to response
app.use((req, res, next) => {
  res.paginatedResults = (results, page, limit, total) => {
    const pagination = {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    };
    
    res.set('X-Pagination-Page', page);
    res.set('X-Pagination-Limit', limit);
    res.set('X-Pagination-Total', total);
    
    return {
      status: 'success',
      pagination,
      data: results
    };
  };
  next();
});

// Helper: Standard success response format
app.use((req, res, next) => {
  res.successResponse = (data, message = 'Success', statusCode = HTTP_STATUS.OK) => {
    res.status(statusCode).json({
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };
  next();
});

// Helper: Standard error response format
app.use((req, res, next) => {
  res.errorResponse = (message, errorCode, statusCode = HTTP_STATUS.BAD_REQUEST) => {
    res.status(statusCode).json({
      status: 'fail',
      message,
      errorCode,
      timestamp: new Date().toISOString()
    });
  };
  next();
});

module.exports = app;
