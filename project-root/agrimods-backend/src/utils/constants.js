// src/utils/constants.js

/**
 * Application Constants
 * Centralized configuration values used throughout the application
 */

// ==================== HTTP STATUS CODES ====================
exports.HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  PARTIAL_CONTENT: 206,
  
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// ==================== ERROR CODES ====================
exports.ERROR_CODES = {
  // Authentication
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NO_TOKEN: 'NO_TOKEN',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  
  // Authorization
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_ALLOWED: 'ROLE_NOT_ALLOWED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Resource
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  QUERY_FAILED: 'QUERY_FAILED',
  
  // File Upload
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Payment
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE'
};

// ==================== USER ROLES ====================
exports.USER_ROLES = {
  USER: 'user',
  PREMIUM: 'premium',
  STAFF: 'staff',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

// ==================== USER STATUS ====================
exports.USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  DELETED: 'deleted'
};

// ==================== TICKET STATUS ====================
exports.TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_CUSTOMER: 'waiting_customer',
  WAITING_STAFF: 'waiting_staff',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

// ==================== TICKET PRIORITY ====================
exports.TICKET_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// ==================== TICKET CATEGORIES ====================
exports.TICKET_CATEGORIES = [
  'technical',
  'billing',
  'account',
  'mod_issue',
  'bundle_issue',
  'payment',
  'refund',
  'feature_request',
  'bug_report',
  'other'
];

// ==================== PAYMENT STATUS ====================
exports.PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
};

// ==================== PAYMENT METHODS ====================
exports.PAYMENT_METHODS = [
  'credit_card',
  'debit_card',
  'paypal',
  'stripe',
  'bank_transfer',
  'crypto'
];

// ==================== ORDER STATUS ====================
exports.ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// ==================== MOD STATUS ====================
exports.MOD_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  ARCHIVED: 'archived',
  SUSPENDED: 'suspended'
};

// ==================== BUNDLE STATUS ====================
exports.BUNDLE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  ARCHIVED: 'archived'
};

// ==================== AFFILIATE STATUS ====================
exports.AFFILIATE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated'
};

// ==================== DOWNLOAD STATUS ====================
exports.DOWNLOAD_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// ==================== FILE UPLOAD LIMITS ====================
exports.FILE_UPLOAD = {
  // Max file sizes in bytes
  MAX_FILE_SIZE: 50 * 1024 * 1024,        // 50MB
  MAX_AVATAR_SIZE: 5 * 1024 * 1024,        // 5MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,        // 10MB
  MAX_DOCUMENT_SIZE: 20 * 1024 * 1024,     // 20MB
  
  // Allowed file types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_MOD_TYPES: ['.zip', '.jar', '.mod', '.mcpack', '.mcaddon'],
  ALLOWED_DOCUMENT_TYPES: ['.pdf', '.doc', '.docx', '.txt', '.md'],
  
  // Max files per upload
  MAX_FILES_PER_UPLOAD: 5,
  MAX_SCREENSHOTS: 10
};

// ==================== RATE LIMITING ====================
exports.RATE_LIMIT = {
  // Requests per window
  GENERAL: {
    MAX: 100,
    WINDOW_MS: 15 * 60 * 1000  // 15 minutes
  },
  
  AUTH: {
    MAX: 10,
    WINDOW_MS: 15 * 60 * 1000  // 15 minutes
  },
  
  LOGIN: {
    MAX: 5,
    WINDOW_MS: 15 * 60 * 1000  // 15 minutes
  },
  
  REGISTER: {
    MAX: 3,
    WINDOW_MS: 60 * 60 * 1000  // 1 hour
  },
  
  PASSWORD_RESET: {
    MAX: 3,
    WINDOW_MS: 60 * 60 * 1000  // 1 hour
  },
  
  API: {
    MAX: 1000,
    WINDOW_MS: 15 * 60 * 1000  // 15 minutes
  },
  
  DOWNLOAD: {
    MAX: 50,
    WINDOW_MS: 60 * 60 * 1000  // 1 hour
  },
  
  UPLOAD: {
    MAX: 20,
    WINDOW_MS: 60 * 60 * 1000  // 1 hour
  },
  
  SUPPORT_TICKET: {
    MAX: 5,
    WINDOW_MS: 60 * 60 * 1000  // 1 hour
  }
};

// ==================== JWT TOKEN ====================
exports.JWT = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '30d',
  PASSWORD_RESET_TOKEN_EXPIRY: '1h',
  EMAIL_VERIFICATION_TOKEN_EXPIRY: '24h',
  DOWNLOAD_TOKEN_EXPIRY: '1h',
  
  // Cookie settings
  COOKIE_EXPIRY_DAYS: 30,
  COOKIE_SECURE: true,
  COOKIE_HTTP_ONLY: true,
  COOKIE_SAME_SITE: 'strict'
};

// ==================== PAGINATION ====================
exports.PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// ==================== SORT OPTIONS ====================
exports.SORT_OPTIONS = {
  ASC: 'asc',
  DESC: 'desc',
  
  // Common sort fields
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  NAME: 'name',
  PRICE: 'price',
  RATING: 'rating',
  DOWNLOADS: 'downloads',
  SALES: 'sales'
};

// ==================== VALIDATION PATTERNS ====================
exports.VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-]{10,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/,
  MONGODB_ID: /^[0-9a-fA-F]{24}$/,
  CREDIT_CARD: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  ZIP_CODE: /^\d{5}(?:-\d{4})?$/
};

// ==================== VALIDATION MESSAGES ====================
exports.VALIDATION_MESSAGES = {
  EMAIL_INVALID: 'Please provide a valid email address',
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  PASSWORD_REQUIRED: 'Password is required',
  USERNAME_INVALID: 'Username must be 3-20 characters, letters, numbers, and underscores only',
  USERNAME_REQUIRED: 'Username is required',
  NAME_REQUIRED: 'Name is required',
  NAME_TOO_LONG: 'Name cannot exceed 100 characters',
  PHONE_INVALID: 'Please provide a valid phone number',
  URL_INVALID: 'Please provide a valid URL',
  DATE_INVALID: 'Please provide a valid date',
  NUMBER_INVALID: 'Please provide a valid number',
  REQUIRED_FIELD: 'This field is required',
  MIN_LENGTH: 'Must be at least {min} characters',
  MAX_LENGTH: 'Cannot exceed {max} characters',
  MIN_VALUE: 'Must be at least {min}',
  MAX_VALUE: 'Cannot exceed {max}'
};

// ==================== CACHE DURATIONS ====================
exports.CACHE = {
  SHORT: 5 * 60,           // 5 minutes
  MEDIUM: 30 * 60,         // 30 minutes
  LONG: 60 * 60,           // 1 hour
  VERY_LONG: 24 * 60 * 60, // 24 hours
  PERMANENT: 7 * 24 * 60 * 60 // 7 days
};

// ==================== API VERSIONS ====================
exports.API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
  CURRENT: 'v1'
};

// ==================== RESPONSE MESSAGES ====================
exports.RESPONSE_MESSAGES = {
  SUCCESS: 'Operation successful',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  FETCHED: 'Data fetched successfully',
  UPLOADED: 'File uploaded successfully',
  DOWNLOADED: 'File downloaded successfully',
  SENT: 'Message sent successfully',
  SUBMITTED: 'Submitted successfully',
  APPROVED: 'Approved successfully',
  REJECTED: 'Rejected successfully',
  CANCELLED: 'Cancelled successfully'
};

// ==================== TIME ZONES ====================
exports.TIME_ZONES = {
  UTC: 'UTC',
  EST: 'America/New_York',
  PST: 'America/Los_Angeles',
  CST: 'America/Chicago',
  MST: 'America/Denver',
  GMT: 'Europe/London',
  CET: 'Europe/Paris',
  IST: 'Asia/Kolkata',
  JST: 'Asia/Tokyo',
  AEST: 'Australia/Sydney'
};

// ==================== CURRENCIES ====================
exports.CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CAD: 'CAD',
  AUD: 'AUD',
  JPY: 'JPY',
  INR: 'INR',
  BTC: 'BTC',
  ETH: 'ETH'
};

// ==================== LANGUAGE CODES ====================
exports.LANGUAGES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
  PT: 'pt',
  RU: 'ru',
  JA: 'ja',
  KO: 'ko',
  ZH: 'zh'
};

// ==================== NOTIFICATION TYPES ====================
exports.NOTIFICATION_TYPES = {
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms',
  IN_APP: 'in_app',
  WEBHOOK: 'webhook'
};

// ==================== NOTIFICATION CATEGORIES ====================
exports.NOTIFICATION_CATEGORIES = {
  ACCOUNT: 'account',
  PAYMENT: 'payment',
  ORDER: 'order',
  SUPPORT: 'support',
  SYSTEM: 'system',
  MARKETING: 'marketing',
  SECURITY: 'security'
};

// ==================== LOG LEVELS ====================
exports.LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
};

// ==================== ENVIRONMENTS ====================
exports.ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

// ==================== FEATURE FLAGS ====================
exports.FEATURE_FLAGS = {
  ENABLE_2FA: true,
  ENABLE_OAUTH: true,
  ENABLE_PAYMENTS: true,
  ENABLE_AFFILIATES: true,
  ENABLE_SUPPORT_TICKETS: true,
  ENABLE_LIVE_CHAT: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CDN: true,
  ENABLE_CACHE: true,
  ENABLE_RATE_LIMITING: true,
  ENABLE_MAINTENANCE_MODE: false
};

// ==================== COMMISSION RATES ====================
exports.COMMISSION_RATES = {
  AFFILIATE_DEFAULT: 0.10,      // 10%
  AFFILIATE_PREMIUM: 0.15,      // 15%
  AFFILIATE_ELITE: 0.20,        // 20%
  PLATFORM_FEE: 0.05,           // 5%
  PAYMENT_PROCESSING_FEE: 0.029 // 2.9%
};

// ==================== WITHDRAWAL LIMITS ====================
exports.WITHDRAWAL_LIMITS = {
  MIN_AMOUNT: 50,               // $50 minimum
  MAX_AMOUNT: 10000,            // $10,000 maximum
  DAILY_LIMIT: 5000,            // $5,000 per day
  MONTHLY_LIMIT: 50000,         // $50,000 per month
  PROCESSING_DAYS: 3            // 3 business days
};

// ==================== SLA SETTINGS ====================
exports.SLA = {
  FIRST_RESPONSE_TIME: {
    LOW: 24 * 60,        // 24 hours
    MEDIUM: 12 * 60,     // 12 hours
    HIGH: 4 * 60,        // 4 hours
    URGENT: 60           // 1 hour
  },
  RESOLUTION_TIME: {
    LOW: 7 * 24 * 60,    // 7 days
    MEDIUM: 3 * 24 * 60, // 3 days
    HIGH: 24 * 60,       // 1 day
    URGENT: 4 * 60       // 4 hours
  }
};

// ==================== SEARCH SETTINGS ====================
exports.SEARCH = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  HIGHLIGHT_TAGS: {
    PRE: '<mark>',
    POST: '</mark>'
  }
};

// ==================== EXPORT HELPERS ====================

/**
 * Get all status values as array
 * @param {object} statusObject - Status constants object
 * @returns {array} Array of status values
 */
exports.getStatusValues = (statusObject) => {
  return Object.values(statusObject);
};

/**
 * Check if a value is a valid status
 * @param {string} value - Value to check
 * @param {object} statusObject - Status constants object
 * @returns {boolean}
 */
exports.isValidStatus = (value, statusObject) => {
  return Object.values(statusObject).includes(value);
};

/**
 * Get environment-specific value
 * @param {object} envValues - Object with environment keys
 * @returns {any} Value for current environment
 */
exports.getEnvValue = (envValues) => {
  const env = process.env.NODE_ENV || 'development';
  return envValues[env] || envValues.development;
};

/**
 * Format file size to human readable
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
exports.formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} Pagination metadata
 */
exports.getPaginationMeta = (page, limit, total) => {
  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
    nextPage: page * limit < total ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};
