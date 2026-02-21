const mongoose = require('mongoose');
const path = require("path");
const app = require(path.join(__dirname, 'src', 'app'));
const config = require(path.join(__dirname, 'src', 'config', 'database'));

// Declare server at top level so it's accessible in error handlers
let server;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🔴 UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('🔴 UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Async startup function
async function startServer() {
  try {
    // 1️⃣ Connect to database FIRST
    await mongoose.connect(config.mongoURI, config.options);
    console.log('✅ Database connection successful');

    // 2️⃣ Only start server AFTER successful connection
    const port = process.env.PORT || 5000;
    server = app.listen(port, () => {
      console.log(`🚀 Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    });

    // 3️⃣ Graceful shutdown
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
    console.error('❌ Failed to start server:', err.message);
    process.exit(1); // Critical: Exit with error code so Render knows it failed
  }
}

startServer();
