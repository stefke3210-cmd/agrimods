// src/models/SupportTicket.js
const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'account', 'mod_issue', 'bundle_issue', 'payment', 'refund', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_customer', 'waiting_staff', 'resolved', 'closed'],
    default: 'open'
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: String,
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  },
  firstResponseAt: Date,
  firstResponseTime: Number,
  lastActivityAt: Date,
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String]
}, {
  timestamps: true
});

// Generate ticket ID before saving
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const count = await this.constructor.countDocuments();
    this.ticketId = `TKT-${Date.now()}-${(count + 1).toString().padStart(5, '0')}`;
  }
  
  if (!this.lastActivityAt) {
    this.lastActivityAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
