// src/models/supportTicket.model.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  message: {
    type: String,
    required: [true, 'Message cannot be empty'],
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  
  attachments: [{
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  isInternal: {
    type: Boolean,
    default: false // Internal notes visible only to staff
  }
});

const supportTicketSchema = new mongoose.Schema({
  // Ticket Info
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  
  subject: {
    type: String,
    required: [true, 'Ticket must have a subject'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  
  // User who created the ticket
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Ticket must belong to a user']
  },
  
  // Assigned staff
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Category
  category: {
    type: String,
    enum: [
      'technical',
      'billing',
      'account',
      'mod_issue',
      'bundle_issue',
      'payment',
      'refund',
      'feature_request',
      'bug_report',
      'other'
    ],
    required: [true, 'Ticket must have a category']
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Status
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_customer', 'waiting_staff', 'resolved', 'closed'],
    default: 'open'
  },
  
  // Initial message
  message: {
    type: String,
    required: [true, 'Ticket must have an initial message'],
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  
  // Attachments for initial message
  attachments: [{
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  
  // All messages in the ticket
  messages: [messageSchema],
  
  // Related entities
  relatedMod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mod'
  },
  
  relatedBundle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bundle'
  },
  
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Tags
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Resolution
  resolution: {
    type: String,
    maxlength: [5000, 'Resolution cannot exceed 5000 characters']
  },
  
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
  
  // Customer satisfaction
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  },
  
  // SLA Tracking
  firstResponseAt: Date,
  firstResponseTime: Number, // in minutes
  
  lastActivityAt: Date,
  
  // Internal notes (not visible to customer)
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
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
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

// Update last activity timestamp
supportTicketSchema.pre('save', function(next) {
  if (this.isModified('messages') || this.isModified('status')) {
    this.lastActivityAt = new Date();
  }
  next();
});

// Track first response time
supportTicketSchema.pre('save', async function(next) {
  if (this.isModified('messages') && this.messages.length > 1 && !this.firstResponseAt) {
    const firstMessage = this.messages[0];
    const firstResponse = this.messages[1];
    
    if (firstResponse.sender.toString() !== this.user.toString()) {
      this.firstResponseAt = firstResponse.createdAt;
      this.firstResponseTime = Math.round(
        (firstResponse.createdAt - firstMessage.createdAt) / (1000 * 60)
      );
    }
  }
  next();
});

// Add message method
supportTicketSchema.methods.addMessage = async function(senderId, message, attachments = [], isInternal = false) {
  this.messages.push({
    sender: senderId,
    message,
    attachments,
    isInternal,
    createdAt: new Date()
  });
  
  // Update status based on who sent the message
  const sender = await mongoose.model('User').findById(senderId);
  if (sender && sender.role === 'admin' || sender && sender.role === 'staff') {
    if (this.status === 'waiting_staff') {
      this.status = 'in_progress';
    }
  } else {
    if (this.status === 'waiting_customer') {
      this.status = 'in_progress';
    }
  }
  
  await this.save();
};

// Add internal note method
supportTicketSchema.methods.addInternalNote = async function(staffId, note) {
  this.internalNotes.push({
    note,
    addedBy: staffId,
    createdAt: new Date()
  });
  
  await this.save();
};

// Assign ticket to staff
supportTicketSchema.methods.assignTo = async function(staffId) {
  this.assignedTo = staffId;
  this.status = 'in_progress';
  await this.save();
};

// Resolve ticket
supportTicketSchema.methods.resolve = async function(staffId, resolution) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolvedAt = new Date();
  this.resolvedBy = staffId;
  await this.save();
};

// Close ticket
supportTicketSchema.methods.close = async function(staffId) {
  this.status = 'closed';
  this.closedAt = new Date();
  this.closedBy = staffId;
  await this.save();
};

// Submit satisfaction rating
supportTicketSchema.methods.submitSatisfaction = async function(rating, comment = '') {
  if (this.status !== 'resolved' && this.status !== 'closed') {
    throw new Error('Can only rate resolved or closed tickets');
  }
  
  this.satisfaction = {
    rating,
    comment,
    submittedAt: new Date()
  };
  
  await this.save();
};

// Static method to get open tickets count
supportTicketSchema.statics.getOpenTicketsCount = async function() {
  return await this.countDocuments({
    status: { $in: ['open', 'in_progress', 'waiting_customer', 'waiting_staff'] }
  });
};

// Static method to get tickets by user
supportTicketSchema.statics.getTicketsByUser = async function(userId, status = null) {
  const query = { user: userId };
  
  if (status) {
    query.status = status;
  }
  
  return await this.find(query)
    .populate('assignedTo', 'name email')
    .populate('relatedMod', 'name slug')
    .sort('-createdAt');
};

// Static method to get tickets by staff
supportTicketSchema.statics.getTicketsByStaff = async function(staffId, status = null) {
  const query = { assignedTo: staffId };
  
  if (status) {
    query.status = status;
  }
  
  return await this.find(query)
    .populate('user', 'name email')
    .sort('-lastActivityAt');
};

// Static method to get overdue tickets
supportTicketSchema.statics.getOverdueTickets = async function(hours = 24) {
  const overdueThreshold = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return await this.find({
    status: { $in: ['open', 'in_progress'] },
    lastActivityAt: { $lt: overdueThreshold }
  })
    .populate('user', 'name email')
    .populate('assignedTo', 'name email')
    .sort('lastActivityAt');
};

// Index for faster queries
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ user: 1, status: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: -1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ lastActivityAt: -1 });
supportTicketSchema.index({ category: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
