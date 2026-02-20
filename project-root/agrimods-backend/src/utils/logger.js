const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ======================
// 🔒 SENSITIVE DATA MASKING CONFIGURATION
// ======================

const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'apikey', 'authtoken', 'refreshtoken',
  'cvv', 'cvc', 'ssn', 'creditcard', 'cardnumber', 'pan', 'pin', 'cvv2',
  'securitycode', 'securitynumber', 'pass', 'pwd', 'authorization',
  'x-api-key', 'privatekey', 'clientsecret', 'accesstoken'
];

const SENSITIVE_PATTERNS = [
  /\b[A-Fa-f0-9]{64}\b/g,                    // SHA-256 hashes
  /\b[A-Fa-f0-9]{40}\b/g,                    // SHA-1 hashes
  /\b[A-Fa-9]{32}\b/g,                       // MD5 hashes
  /\b[A-Za-z0-9]{28,32}\b/g,                 // API keys
  /\b[A-Za-z0-9]{32,64}\b/g,                 // JWT tokens (partial)
  /\b\d{14,16}\b/g,                          // Credit card numbers
  /\b\d{3,4}\b/g,                            // CVV codes
  /\b\d{9}\b/g,                              // SSN
  /Bearer\s+[A-Za-z0-9\-_\.]+/gi,            // Authorization headers
  /api[_-]?key[:=]\s*['"`]?[A-Za-z0-9]+/gi, // API keys in strings
  /password[:=]\s*['"`]?[^'"\s]+/gi          // Passwords in strings
];

// Masking configuration
const MASK_CONFIG = {
  enabled: process.env.LOG_MASK_SENSITIVE !== 'false',
  maskChar: '*',
  preserveLength: true,
  redactedPlaceholder: '[REDACTED]'
};

// ======================
// 🛡️ SENSITIVE DATA MASKING FUNCTIONS
// ======================

/**
 * Mask sensitive values while preserving length
 * @param {string} value - Value to mask
 * @returns {string}
 */
const maskValue = (value) => {
  if (!MASK_CONFIG.enabled || typeof value !== 'string') return value;
  
  if (MASK_CONFIG.preserveLength && value.length > 0) {
    const visibleChars = Math.min(4, Math.floor(value.length / 4));
    return (
      MASK_CONFIG.maskChar.repeat(value.length - visibleChars) + 
      value.slice(-visibleChars)
    );
  }
  
  return MASK_CONFIG.redactedPlaceholder;
};

/**
 * Deep mask sensitive fields in objects (shallow + known nested paths)
 * @param {Object} obj - Object to mask
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {Object}
 */
const maskObject = (obj, depth = 0, maxDepth = 3) => {
  if (!MASK_CONFIG.enabled || typeof obj !== 'object' || obj === null || depth > maxDepth) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => maskObject(item, depth + 1, maxDepth));
  }

  // Handle errors (preserve stack traces)
  if (obj instanceof Error) {
    const maskedError = { ...obj };
    if (maskedError.message) {
      maskedError.message = maskString(maskedError.message);
    }
    return maskedError;
  }

  // Mask object properties
  const masked = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive terms
    const isSensitiveKey = SENSITIVE_KEYS.some(sk => 
      lowerKey.includes(sk) || 
      sk.split('').every(c => lowerKey.includes(c)) // Fuzzy match
    );
    
    if (isSensitiveKey) {
      masked[key] = MASK_CONFIG.redactedPlaceholder;
    } else if (typeof value === 'object' && value !== null) {
      // Recurse into nested objects (limited depth)
      masked[key] = maskObject(value, depth + 1, maxDepth);
    } else if (typeof value === 'string') {
      masked[key] = maskString(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
};

/**
 * Mask sensitive patterns in strings
 * @param {string} str - String to mask
 * @returns {string}
 */
const maskString = (str) => {
  if (!MASK_CONFIG.enabled || typeof str !== 'string') return str;
  
  let masked = str;
  
  // Apply regex patterns
  SENSITIVE_PATTERNS.forEach(pattern => {
    masked = masked.replace(pattern, match => {
      // Special handling for authorization headers
      if (/^Bearer\s+/i.test(match)) {
        const token = match.split(' ')[1] || '';
        return `Bearer ${maskValue(token)}`;
      }
      return maskValue(match);
    });
  });
  
  return masked;
};

/**
 * Mask entire log info object
 * @param {Object} info - Winston log info object
 * @returns {Object}
 */
const maskLogInfo = (info) => {
  if (!MASK_CONFIG.enabled) return info;
  
  // Mask message if string
  if (typeof info.message === 'string') {
    info.message = maskString(info.message);
  }
  
  // Mask message if object
  if (typeof info.message === 'object' && info.message !== null) {
    info.message = maskObject(info.message);
  }
  
  // Mask meta properties
  if (info.meta && typeof info.meta === 'object') {
    info.meta = maskObject(info.meta);
  }
  
  // Mask splat arguments (printf-style logging)
  if (info[Symbol.for('splat')]) {
    info[Symbol.for('splat')] = info[Symbol.for('splat')].map(arg => 
      typeof arg === 'string' ? maskString(arg) : 
      typeof arg === 'object' ? maskObject(arg) : arg
    );
  }
  
  // Mask error objects
  if (info.error instanceof Error) {
    info.error = maskObject(info.error);
  }
  
  return info;
};

// ======================
// 📝 WINSTON FORMATS
// ======================

// Console format with colors (development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, label, requestId, userId, ...meta }) => {
    // Apply masking before formatting
    const maskedMessage = typeof message === 'string' ? maskString(message) : message;
    const maskedMeta = Object.keys(meta).length > 0 ? maskObject(meta) : '';
    
    // Build log line
    let logLine = `${timestamp} [${level.toUpperCase()}]`;
    if (label) logLine += ` [${label}]`;
    if (requestId) logLine += ` [REQ:${requestId.substring(0, 8)}]`;
    if (userId) logLine += ` [USER:${userId}]`;
    logLine += ` ${maskedMessage}`;
    
    if (maskedMeta && typeof maskedMeta === 'object') {
      try {
        logLine += ` | ${JSON.stringify(maskedMeta, null, 2)}`;
      } catch (e) {
        logLine += ` | ${String(maskedMeta)}`;
      }
    }
    
    // Add color based on log level
    switch (level) {
      case 'error': return `\x1b[31m${logLine}\x1b[0m`;    // Red
      case 'warn': return `\x1b[33m${logLine}\x1b[0m`;     // Yellow
      case 'info': return `\x1b[36m${logLine}\x1b[0m`;     // Cyan
      case 'debug': return `\x1b[32m${logLine}\x1b[0m`;    // Green
      default: return logLine;
    }
  })
);

// JSON format for production (structured logging)
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => maskLogInfo(info))(), // Apply masking
  winston.format.json()
);

// ======================
// 🚀 LOG TRANSPORTS
// ======================

// Base transport configuration
const baseTransportConfig = {
  filename: path.join(__dirname, '../logs/%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  handleExceptions: true,
  handleRejections: true
};

// Error log transport (all environments)
const errorLogTransport = new DailyRotateFile({
  ...baseTransportConfig,
  level: 'error',
  filename: path.join(__dirname, '../logs/errors/%DATE%-errors.log'),
  format: jsonFormat
});

// Combined log transport (production only)
const combinedLogTransport = new DailyRotateFile({
  ...baseTransportConfig,
  level: process.env.LOG_LEVEL || 'info',
  filename: path.join(__dirname, '../logs/combined/%DATE%-combined.log'),
  format: jsonFormat
});

// Console transport (development only)
const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: consoleFormat,
  handleExceptions: true,
  handleRejections: true
});

// ======================
// 🏗️ LOGGER INSTANCE
// ======================

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.label({ label: process.env.APP_NAME || 'FS25-Mods' }),
    winston.format.errors({ stack: true })
  ),
  transports: [
    errorLogTransport,
    ...(process.env.NODE_ENV === 'production' ? [combinedLogTransport] : []),
    ...(process.env.NODE_ENV !== 'production' ? [consoleTransport] : [])
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      ...baseTransportConfig,
      filename: path.join(__dirname, '../logs/exceptions/%DATE%-exceptions.log'),
      format: jsonFormat
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      ...baseTransportConfig,
      filename: path.join(__dirname, '../logs/rejections/%DATE%-rejections.log'),
      format: jsonFormat
    })
  ],
  exitOnError: false
});

// ======================
// 🔐 SECURITY ENHANCEMENTS
// ======================

// Prevent logging of sensitive environment variables
const sanitizeEnvVars = () => {
  const sensitiveEnvVars = [
    'JWT_SECRET', 'STRIPE_SECRET_KEY', 'PAYPAL_CLIENT_SECRET',
    'SMTP_PASS', 'DATABASE_PASSWORD', 'ADMIN_PASSWORD'
  ];
  
  sensitiveEnvVars.forEach(key => {
    if (process.env[key]) {
      process.env[key] = '[REDACTED]';
    }
  });
};

// Initialize security features
sanitizeEnvVars();

// ======================
// 🌐 REQUEST CONTEXT INJECTION
// ======================

/**
 * Create child logger with request context
 * @param {Object} context - Request context { requestId, userId, ip, etc. }
 * @returns {Logger}
 */
logger.childWithContext = (context = {}) => {
  // Generate request ID if not provided
  const requestId = context.requestId || context.reqId || uuidv4();
  
  return logger.child({
    requestId,
    userId: context.userId || context.user?.id || 'anonymous',
    ip: context.ip || context.req?.ip || 'unknown',
    userAgent: context.userAgent || context.req?.headers['user-agent']?.substring(0, 100),
    method: context.method || context.req?.method,
    url: context.url || context.req?.originalUrl,
    statusCode: context.statusCode
  });
};

// ======================
// 📊 MONITORING INTEGRATION
// ======================

/**
 * Log security event with severity tagging
 * @param {string} type - Event type (auth_fail, rate_limit, etc.)
 * @param {Object} details - Event details
 */
logger.securityEvent = (type, details = {}) => {
  logger.warn('[SECURITY]', {
    eventType: type,
    severity: details.severity || 'medium',
    ...details,
    timestamp: new Date().toISOString()
  });
  
  // Optional: Integrate with SIEM/security monitoring system
  if (process.env.SECURITY_WEBHOOK_URL) {
    // Fire-and-forget webhook (don't block request)
    fetch(process.env.SECURITY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: true,
        type,
        details,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      })
    }).catch(err => logger.error('Security webhook failed:', err));
  }
};

/**
 * Performance metric logging
 * @param {string} name - Metric name
 * @param {number} duration - Duration in ms
 * @param {Object} tags - Additional tags
 */
logger.metric = (name, duration, tags = {}) => {
  if (process.env.ENABLE_METRICS === 'true') {
    logger.debug('[METRIC]', {
      name,
      duration: Math.round(duration),
      unit: 'ms',
      ...tags
    });
  }
};

// ======================
// 🔄 STREAM FOR MORGAN (HTTP REQUEST LOGGING)
// ======================

logger.stream = {
  write: (message) => {
    // Morgan writes with newline, trim it
    const trimmed = message.trim();
    
    // Skip health check logs in production
    if (process.env.NODE_ENV === 'production' && 
        (trimmed.includes('GET /health') || trimmed.includes('GET /api/health'))) {
      return;
    }
    
    // Parse Morgan message to extract status code
    const match = trimmed.match(/HTTP\/\d\.\d" (\d{3})/);
    const statusCode = match ? parseInt(match[1]) : null;
    
    // Route based on status code
    if (statusCode && statusCode >= 500) {
      logger.error(trimmed);
    } else if (statusCode && statusCode >= 400) {
      logger.warn(trimmed);
    } else {
      logger.http(trimmed);
    }
  }
};

// ======================
// 🧪 TEST LOGGING (For verification)
// ======================

if (require.main === module) {
  console.log('🧪 Testing logger configuration...\n');
  
  logger.debug('Debug message with context', { userId: 123, requestId: 'test-req-001' });
  logger.info('Info message with sensitive data attempt', { 
    password: 'mySuperSecret123!', 
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    apiKey: 'sk_live_51NzABC123defGHIjklMNOpqrsTUvwxYZ'
  });
  logger.warn('Warning message with credit card', { 
    cardNumber: '4111111111111111', 
    cvv: '123' 
  });
  logger.error('Error message with stack trace', new Error('Test error with sensitive data in stack'));
  
  // Test security event
  logger.securityEvent('auth_fail', {
    ip: '192.168.1.100',
    email: 'attacker@example.com',
    reason: 'invalid_password',
    attempts: 5
  });
  
  console.log('\n✅ Logger test completed. Check logs/ directory for output files.');
  process.exit(0);
}

// ======================
// 🚨 ERROR HANDLING FOR LOGGER ITSELF
// ======================

logger.on('error', (err) => {
  console.error('[LOGGER FATAL ERROR]', err);
  // Fallback to console if logger fails
  console.error('Falling back to console logging');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Allow cleanup before exit
  setTimeout(() => process.exit(1), 1000);
});

// ======================
// 📤 EXPORT CONFIGURED LOGGER
// ======================

module.exports = logger;