// src/models/affiliate.model.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const affiliateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Affiliate must belong to a user'],
    unique: true
  },
  
  // Application Information
  website: {
    type: String,
    trim: true,
    maxlength: [500, 'Website URL cannot exceed 500 characters']
  },
  
  socialMedia: {
    type: String,
    trim: true,
    maxlength: [500, 'Social media links cannot exceed 500 characters']
  },
  
  marketingPlan: {
    type: String,
    trim: true,
    maxlength: [2000, 'Marketing plan cannot exceed 2000 characters']
  },
  
  expectedSales: {
    type: String,
    enum: ['0-10', '11-50', '51-100', '100+'],
    default: '0-10'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  
  // Affiliate Details (populated after approval)
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    maxlength: [50, 'Referral code cannot exceed 50 characters']
  },
  
  referralLink: {
    type: String,
    maxlength: [500, 'Referral link cannot exceed 500 characters']
  },
  
  // Earnings
  totalClicks: {
    type: Number,
    default: 0
  },
  
  totalConversions: {
    type: Number,
    default: 0
  },
  
  totalEarnings: {
    type: Number,
    default: 0
  },
  
  pendingEarnings: {
    type: Number,
    default: 0
  },
  
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  
  commissionRate: {
    type: Number,
    default: 0.10, // 10% default commission
    min: 0,
    max: 1
  },
  
  // Payout Information
  payoutMethod: {
    type: String,
    enum: ['paypal', 'stripe', 'bank_transfer'],
    default: 'paypal'
  },
  
  payoutDetails: {
    paypalEmail: String,
    stripeAccountId: String,
    bankAccountNumber: String,
    bankRoutingNumber: String
  },
  
  // Tracking
  clicks: [{
    date: Date,
    ip: String,
    userAgent: String,
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  conversions: [{
    date: Date,
    orderId: String,
    amount: Number,
    commission: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  withdrawals: [{
    date: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    transactionId: String,
    notes: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate unique referral code before saving
affiliateSchema.pre('save', async function(next) {
  if (!this.referralCode && this.status === 'approved') {
    const code = 'AFF-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    this.referralCode = code;
    this.referralLink = `${process.env.FRONTEND_URL}/ref/${code}`;
  }
  next();
});

// Add click tracking method
affiliateSchema.methods.trackClick = async function(ip, userAgent, referredUser = null) {
  this.clicks.push({
    date: new Date(),
    ip,
    userAgent,
    referredUser
  });
  this.totalClicks += 1;
  await this.save();
};

// Add conversion tracking method
affiliateSchema.methods.trackConversion = async function(orderId, amount, userId) {
  const commission = amount * this.commissionRate;
  
  this.conversions.push({
    date: new Date(),
    orderId,
    amount,
    commission,
    userId
  });
  
  this.totalConversions += 1;
  this.totalEarnings += commission;
  this.pendingEarnings += commission;
  
  await this.save();
  
  return commission;
};

// Add withdrawal method
affiliateSchema.methods.requestWithdrawal = async function(amount, payoutMethod, payoutDetails) {
  if (amount > this.pendingEarnings) {
    throw new Error('Insufficient earnings for withdrawal');
  }
  
  if (amount < 50) {
    throw new Error('Minimum withdrawal amount is $50');
  }
  
  this.withdrawals.push({
    date: new Date(),
    amount,
    status: 'pending',
    notes: `Requested via ${payoutMethod}`
  });
  
  this.pendingEarnings -= amount;
  
  await this.save();
  
  return this.withdrawals[this.withdrawals.length - 1];
};

// Virtual for total referrals
affiliateSchema.virtual('totalReferrals').get(function() {
  return new Set(this.clicks.map(click => click.referredUser?.toString())).size;
});

// Index for faster queries
affiliateSchema.index({ user: 1 });
affiliateSchema.index({ referralCode: 1 });
affiliateSchema.index({ status: 1 });
affiliateSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Affiliate', affiliateSchema);
