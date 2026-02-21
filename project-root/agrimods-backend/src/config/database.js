// src/config/database.js

require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGODB_URI,
  options: {
    // These options are for newer versions of Mongoose
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4 // Use IPv4, skip trying to resolve to IPv6
  }
};
