// server.js (in project root)
require('dotenv').config();
const mongoose = require('mongoose');
const path = require("path");

// ✅ IMPORT CONSTANTS (from version 2)
const { 
  HTTP_STATUS, 
  ENVIRONMENTS, 
  ERROR_CODES 
} = require('./src/utils/constants');

// ✅ IMPORT APP AND CONFIG USING path.join (from version 1)
const app = require(path.join(__dirname, 'src', 'app'));
const config = require(path.join(__dirname, 'src', 'config', 'database'));

// ✅ MOUNT ROUTES (if needed at server level - usually done in app.js)
// const authRoutes = require('./src/routes/auth.routes');
// app.use('/api/v1/auth', authRoutes);

// ==================== 🔍 DEBUG LOGGING (from version 1) ====================
console.log('🔍 DEBUG: Config loaded:', !!config);
console.log('🔍 DEBUG: MONGODB_URI exists:', !!config?.mongoURI);
console.log('🔍 DEBUG: MONGODB_URI value:', config?.mongoURI ? 'SET' : 'UNDEFINED');
console.log('🔍 DEBUG: FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('🔍 DEBUG: NODE_ENV:', process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT);

// ==================== ✅ VALIDATE CRITICAL CONFIG (combined) ====================
if (!config?.mongoURI) {
  console.error('❌ CRITICAL: MONGODB_URI is not defined in config/database.js');
  console.error('💡 Fix: Ensure src/config/database.js exports: module.exports = { mongoURI: process.env.MONGODB_URI }');
  process.exit(HTTP_STATUS.SERVICE_UNAVAILABLE); // ✅ Using constant from v2
}

// ==================== DECLARE SERVER AT TOP LEVEL (from version 1) ====================
let server;

// ==================== 🛡️ ERROR HANDLERS (combined: detailed + constants) ====================

// Handle uncaught exceptions (synchronous errors)
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Full error:', err);
  
  if (server) {
    server.close(() => {
      mongoose.connection?.close(() => {
        console.log('✅ Database connection closed');
        process.exit(HTTP_STATUS.INTERNAL_SERVER_ERROR); // ✅ Using constant
      });
    });
  } else {
    process.exit(HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Handle unhandled promise rejections (async errors)
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Full error:', err);
  
  if (server) {
    server.close(() => {
      mongoose.connection?.close(() => {
        console.log('✅ Database connection closed');
        process.exit(HTTP_STATUS.INTERNAL_SERVER_ERROR); // ✅ Using constant
      });
    });
  } else {
    process.exit(HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// ==================== 🚀 ASYNC SERVER STARTUP (from version 1, enhanced) ====================
async function startServer() {
  try {
    console.log('🟡 Attempting to connect to MongoDB...');
    console.log('🟡 Connection string:', config.mongoURI ? 'Present' : 'MISSING!');
    
    // ✅ Connect to database FIRST (from version 1)
    // ✅ With timeout options (from version 2)
    await mongoose.connect(config.mongoURI, {
      ...config.options, // Merge any options from database.js
      serverSelectionTimeoutMS: 5000,  // ✅ From version 2
      socketTimeoutMS: 45000,          // ✅ From version 2
      maxPoolSize: 10,
      minPoolSize: 5,
      connectTimeoutMS: 10000
    });
    
    console.log('✅ Database connection successful');
    console.log('🗄️ Connected to:', mongoose.connection.name);

    // ✅ Only start server AFTER successful connection (from version 1)
    const PORT = process.env.PORT || 5000;
    const NODE_ENV = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT; // ✅ Using constant
    
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`); // ✅ Using constant
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api/v1`);
      
      // Log extra info in development
      if (NODE_ENV === ENVIRONMENTS.DEVELOPMENT) {
        console.log('📦 Environment: Development');
        console.log('🔧 Debug mode: Enabled');
      }
    });

    // ==================== 🔄 GRACEFUL SHUTDOWN (combined) ====================

    // Handle SIGTERM (Render, Heroku, Docker, etc.)
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down gracefully...');
      gracefulShutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C locally)
    process.on('SIGINT', () => {
      console.log('👋 SIGINT received. Shutting down gracefully...');
      gracefulShutdown('SIGINT');
    });

  } catch (err) {
    // ✅ Detailed error logging (from version 1)
    console.error('❌ Failed to start server:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Full error:', err);
    
    // ✅ Exit with proper constant code (from version 2)
    process.exit(HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
}

// ==================== 🔄 GRACEFUL SHUTDOWN FUNCTION (enhanced) ====================
function gracefulShutdown(signal) {
  console.log(`🔄 Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('❌ Error closing server:', err.message);
      } else {
        console.log('✅ HTTP server closed');
      }
      
      if (mongoose.connection?.readyState === 1) {
        mongoose.connection.close((closeErr) => {
          if (closeErr) {
            console.error('❌ Error closing database:', closeErr.message);
          } else {
            console.log('✅ Database connection closed');
          }
          console.log('✅ Graceful shutdown complete');
          process.exit(HTTP_STATUS.OK); // ✅ Using constant
        });
      } else {
        console.log('✅ No active database connection to close');
        process.exit(HTTP_STATUS.OK);
      }
    });
  } else {
    console.log('✅ Server not started, exiting directly');
    process.exit(HTTP_STATUS.OK);
  }
}

// ==================== 🟢 START THE SERVER ====================
console.log('🟢 Initializing server...');
startServer();
