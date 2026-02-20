const { 
  body, 
  param, 
  query, 
  validationResult, 
  check,
  matchedData 
} = require('express-validator');
const logger = require('../utils/logger');
const { isValidObjectId } = require('../utils/helpers');

// ======================
// 🔒 SECURITY VALIDATORS (CRITICAL)
// ======================

/**
 * Prevent NoSQL injection in object IDs
 * @param {string} fieldName - Field name to validate
 */
const preventNoSQLInjection = (fieldName) => {
  return body(fieldName).custom((value) => {
    if (typeof value !== 'string') return true;
    // Block MongoDB operators and special characters
    const blockedPatterns = [
      /\$where/i, /\$ne/i, /\$gt/i, /\$lt/i, /\$nin/i, /\$in/i,
      /\$regex/i, /\$exists/i, /\$type/i, /\$mod/i, /\$comment/i,
      /[\{\}\$\;]/, // Block braces, dollar signs, semicolons
      /<script/i, /javascript:/i, /onerror=/i // Basic XSS patterns
    ];
    
    for (const pattern of blockedPatterns) {
      if (pattern.test(value)) {
        logger.warn(`[SECURITY] Blocked NoSQL/XSS attempt in ${fieldName}: ${value.substring(0, 50)}`);
        throw new Error('Invalid characters detected. Please use only alphanumeric characters.');
      }
    }
    return true;
  });
};

/**
 * Sanitize and validate MongoDB ID
 * @param {string} paramName - Parameter name
 * @param {boolean} required - Whether ID is required
 */
const validateMongoId = (paramName = 'id', required = true) => {
  const validator = required 
    ? param(paramName).exists().withMessage(`${paramName} is required`)
    : param(paramName).optional();
  
  return [
    validator,
    param(paramName).custom((value) => {
      if (!value) return true;
      if (!isValidObjectId(value)) {
        throw new Error(`Invalid ${paramName} format. Must be a valid MongoDB ObjectId.`);
      }
      return true;
    }),
    preventNoSQLInjection(paramName)
  ];
};

/**
 * Validate email with security checks
 */
const validateEmail = () => {
  return body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ min: 5, max: 254 }).withMessage('Email must be 5-254 characters')
    .customSanitizer(email => email.toLowerCase())
    .custom(async (email) => {
      // Block disposable email providers in production
      if (process.env.NODE_ENV === 'production') {
        const disposableDomains = [
          'tempmail.com', 'guerrillamail.com', 'mailinator.com',
          '10minutemail.com', 'throwawaymail.com'
        ];
        const domain = email.split('@')[1];
        if (disposableDomains.includes(domain)) {
          throw new Error('Disposable email addresses are not allowed');
        }
      }
      return true;
    });
};

/**
 * Strong password validation with security requirements
 */
const validatePassword = (fieldName = 'password') => {
  return body(fieldName)
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 10, max: 128 }).withMessage('Password must be 10-128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character (!@#$%^&*)')
    .not().matches(/\s/).withMessage('Password cannot contain spaces')
    .custom((value) => {
      // Block common weak passwords
      const weakPasswords = [
        'password', '12345678', 'qwerty', 'admin123', 'letmein',
        'welcome', 'monkey', 'dragon', '123456789', 'baseball'
      ];
      if (weakPasswords.includes(value.toLowerCase())) {
        throw new Error('Password is too common. Please choose a stronger password.');
      }
      return true;
    });
};

// ======================
// 📝 COMMON VALIDATORS
// ======================

const validateUsername = () => {
  return body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .customSanitizer(username => username.toLowerCase());
};

const validateName = (fieldName = 'name') => {
  return body(fieldName)
    .trim()
    .notEmpty().withMessage(`${fieldName} is required`)
    .isLength({ min: 2, max: 100 }).withMessage(`${fieldName} must be 2-100 characters`)
    .matches(/^[a-zA-Z0-9\s\-_',.]+$/).withMessage(`${fieldName} contains invalid characters`);
};

const validateUrl = (fieldName = 'url') => {
  return body(fieldName)
    .optional()
    .trim()
    .isURL().withMessage('Invalid URL format')
    .isLength({ max: 500 }).withMessage('URL is too long');
};

const validatePhone = () => {
  return body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage('Invalid phone number format (e.g., +1-555-123-4567)');
};

// ======================
// 👤 USER VALIDATIONS
// ======================

const validateRegister = () => {
  return [
    validateEmail(),
    validatePassword(),
    body('confirmPassword')
      .trim()
      .notEmpty().withMessage('Please confirm your password')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    body('acceptTerms')
      .exists().withMessage('You must accept the terms and conditions')
      .isBoolean().withMessage('Accept terms must be a boolean')
      .custom(value => {
        if (!value) throw new Error('You must accept the terms and conditions to register');
        return true;
      }),
    body('captchaToken')
      .optional()
      .isString().withMessage('Invalid CAPTCHA token')
  ];
};

const validateLogin = () => {
  return [
    validateEmail(),
    body('password')
      .trim()
      .notEmpty().withMessage('Password is required')
  ];
};

const validateUpdateProfile = () => {
  return [
    body('firstName').optional().isLength({ min: 1, max: 50 }),
    body('lastName').optional().isLength({ min: 1, max: 50 }),
    body('bio').optional().isLength({ max: 500 }),
    validatePhone(),
    body('avatarUrl').optional().isURL()
  ];
};

const validateChangePassword = () => {
  return [
    body('currentPassword').trim().notEmpty().withMessage('Current password is required'),
    validatePassword('newPassword'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match');
      }
      return true;
    })
  ];
};

// ======================
// 📦 MOD VALIDATIONS
// ======================

const validateCreateMod = () => {
  return [
    validateName('name'),
    body('description')
      .trim()
      .notEmpty().withMessage('Description is required')
      .isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
    body('version')
      .trim()
      .notEmpty().withMessage('Version is required')
      .matches(/^(\d+)\.(\d+)\.(\d+)$/).withMessage('Version must be in format X.Y.Z (e.g., 1.2.3)'),
    body('category')
      .trim()
      .notEmpty().withMessage('Category is required')
      .isIn(['vehicles', 'maps', 'tools', 'crops', 'buildings', 'gameplay', 'graphics', 'sound', 'utility', 'other'])
      .withMessage('Invalid category'),
    body('tags')
      .optional()
      .isArray({ max: 10 }).withMessage('Maximum 10 tags allowed')
      .custom(tags => {
        if (tags && tags.some(tag => typeof tag !== 'string' || tag.length > 30)) {
          throw new Error('Each tag must be a string under 30 characters');
        }
        return true;
      }),
    body('price')
      .optional()
      .isNumeric().withMessage('Price must be a number')
      .toFloat()
      .isFloat({ min: 0 }).withMessage('Price cannot be negative'),
    body('isFree').optional().isBoolean(),
    body('compatibility')
      .optional()
      .isArray().withMessage('Compatibility must be an array')
      .custom(compat => {
        if (compat && compat.some(item => typeof item !== 'string' || item.length > 50)) {
          throw new Error('Compatibility items must be strings under 50 characters');
        }
        return true;
      })
  ];
};

const validateSearchMod = () => {
  return [
    query('query').optional().trim().isLength({ max: 100 }),
    query('category').optional().isIn([
      'vehicles', 'maps', 'tools', 'crops', 'buildings', 
      'gameplay', 'graphics', 'sound', 'utility', 'other', 'all'
    ]),
    query('sortBy').optional().isIn([
      'newest', 'oldest', 'downloads', 'rating', 'name', 'price_low', 'price_high'
    ]),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('minPrice').optional().isNumeric().toFloat(),
    query('maxPrice').optional().isNumeric().toFloat(),
    query('isFree').optional().isBoolean().toBoolean()
  ];
};

// ======================
// 💰 PAYMENT VALIDATIONS
// ======================

const validateCreatePayment = () => {
  return [
    ...validateMongoId('modId'),
    body('amount')
      .trim()
      .notEmpty().withMessage('Amount is required')
      .isNumeric().withMessage('Amount must be a number')
      .toFloat()
      .isFloat({ min: 0.5 }).withMessage('Minimum amount is $0.50'),
    body('currency')
      .optional()
      .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'])
      .withMessage('Invalid currency code'),
    body('paymentMethod')
      .trim()
      .notEmpty().withMessage('Payment method is required')
      .isIn(['paypal', 'stripe', 'credit_card'])
      .withMessage('Invalid payment method'),
    validateEmail(),
    body('metadata').optional().isObject()
  ];
};

// ======================
// 🎫 TICKET VALIDATIONS
// ======================

const validateCreateTicket = () => {
  return [
    validateName('subject'),
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ min: 10, max: 5000 }).withMessage('Message must be 10-5000 characters'),
    body('category')
      .optional()
      .isIn(['installation', 'bug_report', 'feature_request', 'payment', 'account', 'mod_issue', 'technical', 'general', 'other'])
      .withMessage('Invalid category'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent', 'critical'])
      .withMessage('Invalid priority'),
    body('attachments').optional().isArray({ max: 5 })
  ];
};

// ======================
// 🤝 AFFILIATE VALIDATIONS
// ======================

const validateRegisterAffiliate = () => {
  return [
    body('payoutEmail')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('payoutMethod')
      .optional()
      .isIn(['paypal', 'stripe', 'bank', 'crypto'])
      .withMessage('Invalid payout method'),
    body('payoutThreshold')
      .optional()
      .isNumeric().withMessage('Payout threshold must be a number')
      .toFloat()
      .isFloat({ min: 10, max: 10000 }).withMessage('Threshold must be $10-$10,000')
  ];
};

const validateRequestPayout = () => {
  return [
    body('amount')
      .trim()
      .notEmpty().withMessage('Amount is required')
      .isNumeric().withMessage('Amount must be a number')
      .toFloat()
      .custom((value, { req }) => {
        if (value < 10) throw new Error('Minimum payout amount is $10');
        if (value > 10000) throw new Error('Maximum payout amount is $10,000');
        return true;
      }),
    body('method')
      .optional()
      .isIn(['paypal', 'stripe', 'bank', 'crypto'])
      .withMessage('Invalid payout method'),
    body('notes').optional().isLength({ max: 500 })
  ];
};

// ======================
// 📬 CONTACT VALIDATION
// ======================

const validateContactForm = () => {
  return [
    validateName('name'),
    validateEmail(),
    body('subject')
      .trim()
      .notEmpty().withMessage('Subject is required')
      .isLength({ min: 5, max: 200 }).withMessage('Subject must be 5-200 characters'),
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ min: 10, max: 5000 }).withMessage('Message must be 10-5000 characters'),
    validatePhone(),
    body('captchaToken')
      .optional()
      .isString().withMessage('Invalid CAPTCHA token')
  ];
};

// ======================
// 🔍 PAGINATION VALIDATION
// ======================

const validatePagination = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
      .toInt(),
    query('sortBy').optional().trim().isLength({ max: 50 }),
    query('order').optional().isIn(['asc', 'desc'])
  ];
};

// ======================
// 🛡️ ERROR HANDLING MIDDLEWARE
// ======================

/**
 * Centralized validation error handler
 * Formats errors consistently and logs security events
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    const errorMessages = errorArray.map(err => ({
      field: err.param,
      message: err.msg,
      location: err.location
    }));
    
    // Log security-related errors
    const securityErrors = errorArray.filter(err => 
      err.msg.includes('Invalid characters') || 
      err.msg.includes('NoSQL') ||
      err.msg.includes('XSS')
    );
    
    if (securityErrors.length > 0) {
      logger.warn('[SECURITY] Validation blocked potential attack:', {
        ip: req.ip,
        userId: req.user?.id || 'anonymous',
        path: req.path,
        errors: securityErrors,
        userAgent: req.get('user-agent')
      });
    }
    
    // Log all validation errors for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Validation errors:', errorMessages);
    }
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
      count: errorMessages.length,
      timestamp: new Date().toISOString()
    });
  }
  
  // Sanitize request data after validation
  req.sanitizedData = matchedData(req, { locations: ['body', 'query', 'params'] });
  
  next();
};

/**
 * Custom validation error handler with status code
 */
const handleCustomValidationError = (message, statusCode = 400) => {
  return (req, res, next) => {
    logger.warn(`Custom validation error [${statusCode}]: ${message}`);
    res.status(statusCode).json({
      success: false,
      message: message,
      timestamp: new Date().toISOString()
    });
  };
};

// ======================
// ✅ ASYNC VALIDATORS (Database Checks)
// ======================

/**
 * Check if email is already registered
 */
const validateUniqueEmail = async (value) => {
  const User = require('../models/User');
  const user = await User.findOne({ email: value.toLowerCase() });
  if (user) {
    throw new Error('Email already registered. Please use a different email or login.');
  }
  return true;
};

/**
 * Check if username is already taken
 */
const validateUniqueUsername = async (value) => {
  const User = require('../models/User');
  const user = await User.findOne({ username: value.toLowerCase() });
  if (user) {
    throw new Error('Username already taken. Please choose a different username.');
  }
  return true;
};

/**
 * Verify user owns the resource
 */
const validateOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const Model = require(`../models/${req.modelName}`);
    
    const resource = await Model.findById(id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Check ownership (works for User, Mod, Ticket models)
    const ownerId = resource.userId || resource.createdBy || resource.user;
    if (ownerId?.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      logger.warn(`[SECURITY] Unauthorized ownership attempt: User ${req.user.id} tried to access ${req.modelName} ${id}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this resource'
      });
    }
    
    req.resource = resource;
    next();
  } catch (error) {
    logger.error('Ownership validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

// ======================
// 🚦 ACCESS CONTROL VALIDATORS
// ======================

/**
 * Require admin access
 */
const validateAdminAccess = (req, res, next) => {
  if (req.user.role !== 'admin') {
    logger.warn(`[SECURITY] Unauthorized admin access attempt: User ${req.user.id} on ${req.path}`);
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

/**
 * Require verified email
 */
const validateEmailVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to access this feature'
    });
  }
  next();
};

// ======================
// 📦 EXPORT VALIDATORS
// ======================

module.exports = {
  // Security validators
  preventNoSQLInjection,
  validateMongoId,
  validateEmail,
  validatePassword,
  
  // Common validators
  validateUsername,
  validateName,
  validateUrl,
  validatePhone,
  
  // User validators
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateUniqueEmail,
  validateUniqueUsername,
  
  // Mod validators
  validateCreateMod,
  validateSearchMod,
  
  // Payment validators
  validateCreatePayment,
  
  // Ticket validators
  validateCreateTicket,
  
  // Affiliate validators
  validateRegisterAffiliate,
  validateRequestPayout,
  
  // Contact validator
  validateContactForm,
  
  // Pagination validator
  validatePagination,
  
  // Error handlers
  handleValidationErrors,
  handleCustomValidationError,
  
  // Access control
  validateAdminAccess,
  validateEmailVerified,
  validateOwnership
};
