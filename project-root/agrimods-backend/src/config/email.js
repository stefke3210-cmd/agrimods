// src/config/email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Email templates
const emailTemplates = {
  welcome: (username) => ({
    subject: 'Welcome to AgriMods!',
    html: `
      <h1>Welcome to AgriMods, ${username}!</h1>
      <p>Thank you for joining our platform.</p>
      <p>Get started by exploring our mods and features.</p>
    `
  }),
  
  passwordReset: (resetToken, username) => ({
    subject: 'Password Reset Request',
    html: `
      <h2>Hello ${username},</h2>
      <p>You requested to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password/${resetToken}" 
         style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  }),
  
  paymentConfirmation: (orderDetails) => ({
    subject: 'Payment Confirmation',
    html: `
      <h2>Payment Successful!</h2>
      <p>Thank you for your purchase.</p>
      <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
      <p><strong>Amount:</strong> $${orderDetails.amount}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    `
  })
};

module.exports = {
  transporter,
  emailTemplates
};
