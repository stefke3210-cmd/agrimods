// src/services/email.service.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Email templates
const templates = {
  welcome: (user) => ({
    subject: 'Welcome to AgriMods! 🌱',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to AgriMods!</h1>
            </div>
            <div class="content">
              <p>Hello ${user.name || 'there'},</p>
              <p>Thank you for joining AgriMods - your one-stop platform for agricultural mods and resources!</p>
              <p>Get started by:</p>
              <ul>
                <li>Exploring our mod collection</li>
                <li>Connecting with other farmers</li>
                <li>Sharing your own creations</li>
              </ul>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AgriMods. All rights reserved.</p>
              <p>If you didn't create this account, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  passwordReset: (user, resetToken) => ({
    subject: 'Password Reset Request 🔐',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <p>Hello ${user.name || 'there'},</p>
              <p>You requested to reset your password for your AgriMods account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${process.env.FRONTEND_URL}/reset-password/${resetToken}" class="button">Reset Password</a>
              <div class="warning">
                <strong>⚠️ Important:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AgriMods. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  emailVerification: (user, verificationToken) => ({
    subject: 'Verify Your Email Address ✓',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello ${user.name || 'there'},</p>
              <p>Thank you for registering with AgriMods! Please verify your email address to complete your registration.</p>
              <a href="${process.env.FRONTEND_URL}/verify-email/${verificationToken}" class="button">Verify Email</a>
              <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${process.env.FRONTEND_URL}/verify-email/${verificationToken}</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AgriMods. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  paymentConfirmation: (user, order) => ({
    subject: 'Payment Confirmation - Order #' + order.orderId,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Payment Successful</h1>
            </div>
            <div class="content">
              <p>Hello ${user.name || 'there'},</p>
              <p>Thank you for your purchase! Your payment has been confirmed.</p>
              <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Amount:</strong> $${order.amount}</p>
                <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
                <p><strong>Items:</strong> ${order.items}</p>
              </div>
              <p>You can view your order history in your dashboard.</p>
              <a href="${process.env.FRONTEND_URL}/dashboard/orders" style="display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Order</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AgriMods. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  affiliateApproval: (user) => ({
    subject: 'Your Affiliate Application Has Been Approved! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #9C27B0; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations!</h1>
            </div>
            <div class="content">
              <p>Hello ${user.name || 'there'},</p>
              <p>Great news! Your affiliate application has been <strong>approved</strong>.</p>
              <p>You can now start earning commissions by referring customers to AgriMods.</p>
              <a href="${process.env.FRONTEND_URL}/affiliate/dashboard" class="button">Go to Affiliate Dashboard</a>
              <p style="margin-top: 20px;">Your unique referral link will be available in your dashboard.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AgriMods. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  })
};

// Send email
const sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `AgriMods <${process.env.EMAIL_FROM || 'noreply@agrimods.com'}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.to}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new AppError('Failed to send email. Please try again later.', 500);
  }
};

// Public methods
module.exports = {
  // Send welcome email
  sendWelcomeEmail: async (user) => {
    const template = templates.welcome(user);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  },

  // Send password reset email
  sendPasswordResetEmail: async (user, resetToken) => {
    const template = templates.passwordReset(user, resetToken);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  },

  // Send email verification
  sendVerificationEmail: async (user, verificationToken) => {
    const template = templates.emailVerification(user, verificationToken);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  },

  // Send payment confirmation
  sendPaymentConfirmation: async (user, order) => {
    const template = templates.paymentConfirmation(user, order);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  },

  // Send affiliate approval email
  sendAffiliateApprovalEmail: async (user) => {
    const template = templates.affiliateApproval(user);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  },

  // Send custom email
  sendCustomEmail: async (to, subject, html, text = null) => {
    return await sendEmail({ to, subject, html, text });
  },

  // Test email connection
  testConnection: async () => {
    const transporter = createTransporter();
    try {
      await transporter.verify();
      console.log('✅ Email server connection successful');
      return { success: true, message: 'Email server is ready' };
    } catch (error) {
      console.error('❌ Email server connection failed:', error);
      return { success: false, message: error.message };
    }
  }
};
