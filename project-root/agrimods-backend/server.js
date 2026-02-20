const mongoose = require('mongoose');
const path = require("path");
const app = require(path.join(__dirname, 'src', 'app'));
const config = require(path.join(__dirname, 'src', 'config', 'database'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Connect to database
mongoose.connect(config.mongoURI, config.options)
  .then(() => {
    console.log('✅ Database connection successful');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

// Start server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port} in ${process.env.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM for graceful shutdown (for Heroku, AWS, etc.)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });

});
