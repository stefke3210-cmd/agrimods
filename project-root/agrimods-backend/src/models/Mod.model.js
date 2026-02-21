// src/models/Mod.model.js
const mongoose = require('mongoose');

const modSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Mod must have a name'],
    trim: true,
    maxlength: [100, 'Mod name cannot exceed 100 characters']
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  description: {
    type: String,
    required: [true, 'Mod must have a description'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  
  modVersion: {
    type: String,
    required: [true, 'Mod must have a version'],
    trim: true
  },
  
  gameVersion: {
    type: String,
    required: [true, 'Mod must specify compatible game version'],
    trim: true
  },
  
  fsVersion: {
    type: String,
    enum: ['FS19', 'FS22', 'FS25'],
    default: 'FS22'
  },
  
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Mod must have a category']
  },
  
  file: {
    filename: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  screenshots: [{
    url: String,
    caption: String,
    order: Number
  }],
  
  coverImage: String,
  
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Mod must have an author']
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  downloads: {
    type: Number,
    default: 0
  },
  
  ratingsAverage: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    title: String,
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'published', 'unpublished', 'archived'],
    default: 'pending_review'
  },
  
  rejectionReason: String,
  
  isFree: {
    type: Boolean,
    default: true
  },
  
  price: {
    type: Number,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  requirements: String,
  installationInstructions: String,
  changelog: String,
  
  featured: {
    type: Boolean,
    default: false
  },
  
  featuredUntil: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug
modSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes
modSchema.index({ slug: 1 });
modSchema.index({ status: 1 });
modSchema.index({ category: 1 });
modSchema.index({ author: 1 });
modSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Mod', modSchema);
