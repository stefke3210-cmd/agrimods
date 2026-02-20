const express = require('express');
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

// Import routes
const authRoutes = require('./routes/auth.routes');
const modRoutes = require('./routes/mod.routes');
const paymentRoutes = require('./routes/payment.routes');
const supportRoutes = require('./routes/support.routes');
const affiliateRoutes = require('./routes/affiliate.routes');
const downloadRoutes = require('./routes/download.routes');

// Import middleware
const { protect } = require('./controllers/auth.controller');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/error.controller');

const app = express();

// 1. GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX || 100,
  windowMs: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
  ]
}));

// Compress responses
app.use(compression());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2. ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/mods', modRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/support', protect, supportRoutes);
app.use('/api/v1/affiliate', protect, affiliateRoutes);
app.use('/api/v1/download', protect, downloadRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AgriMods API is operational',
    timestamp: new Date().toISOString()
  });
});

// 3. ERROR HANDLING
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;