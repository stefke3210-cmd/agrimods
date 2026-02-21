const mongoose = require('mongoose');
const path = require("path");
const app = require(path.join(__dirname, 'src', 'app'));
const config = require(path.join(__dirname, 'src', 'config', 'database'));

// 🔍 DEBUG: Check if config is loaded
console.log('🔍 DEBUG: Config loaded:', !!config);
console.log('🔍 DEBUG: MONGODB_URI exists:', !!config.mongoURI);
console.log('🔍 DEBUG: MONGODB_URI value:', config.mongoURI ? 'SET' : 'UNDEFINED');
console.log('🔍 DEBUG: FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');

// Declare server at top level so it's accessible in error handlers
let server;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🔴 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Full error:', err);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('🔴 UNHANDLED REJECTION! Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Full error:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Async startup function
async function startServer() {
  try {
    console.log('🟡 Attempting to connect to MongoDB...');
    console.log('🟡 Connection string:', config.mongoURI ? 'Present' : 'MISSING!');
    
    // Connect to database FIRST
    await mongoose.connect(config.mongoURI, config.options);
    console.log('✅ Database connection successful');

    // Only start server AFTER successful connection
    const port = process.env.PORT || 5000;
    server = app.listen(port, () => {
      console.log(`🚀 Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        mongoose.connection.close(() => {
          console.log('✅ Process terminated');
          process.exit(0);
        });
      });
    });

  } catch (err) {
    console.error('❌ Failed to start server:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

startServer();
