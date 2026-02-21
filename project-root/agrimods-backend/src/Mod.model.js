// src/models/mod.model.js
const mongoose = require('mongoose');

const modSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Mod must have a name'],
    trim: true,
    maxlength: [100, 'Mod name cannot exceed 100 characters'],
    minlength: [3, 'Mod name must be at least 3 characters']
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
  
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  
  // Version info
  modVersion: {
    type: String,
    required: [true, 'Mod must have a version'],
    trim: true
  },
  
  // Game compatibility
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
  
  // Category
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Mod must have a category']
  },
  
  // File information
  file: {
    filename: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Images/Screenshots
  screenshots: [{
    url: String,
    caption: String,
    order: Number
  }],
  
  coverImage: {
    type: String
  },
  
  // Author
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Mod must have an author']
  },
  
  // Tags
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Statistics
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
  
  // Reviews
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
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'published', 'unpublished', 'archived', 'suspended'],
    default: 'pending_review'
  },
  
  rejectionReason: {
    type: String,
    maxlength: [1000, 'Rejection reason cannot exceed 1000 characters']
  },
  
  // Pricing
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
  
  // Requirements
  requirements: {
    type: String,
    maxlength: [2000, 'Requirements cannot exceed 2000 characters']
  },
  
  installationInstructions: {
    type: String,
    maxlength: [5000, 'Instructions cannot exceed 5000 characters']
  },
  
  // Changelog
  changelog: {
    type: String,
    maxlength: [5000, 'Changelog cannot exceed 5000 characters']
  },
  
  // Metadata
  featured: {
    type: Boolean,
    default: false
  },
  
  featuredUntil: Date,
  
  // SEO
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from name before saving
modSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Calculate average rating before saving
modSchema.pre('save', async function(next) {
  if (this.reviews.length > 0) {
    const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratingsAverage = total / this.reviews.length;
    this.ratingsQuantity = this.reviews.length;
  }
  next();
});

// Add review method
modSchema.methods.addReview = async function(userId, rating, title, comment) {
  // Check if user already reviewed
  const existingReview = this.reviews.find(r => r.user.toString() === userId.toString());
  
  if (existingReview) {
    throw new Error('You have already reviewed this mod');
  }
  
  this.reviews.push({
    user: userId,
    rating,
    title,
    comment,
    createdAt: new Date()
  });
  
  await this.save();
};

// Increment downloads method
modSchema.methods.incrementDownloads = async function() {
  this.downloads += 1;
  await this.save();
};

// Virtual for current price
modSchema.virtual('currentPrice').get(function() {
  return this.isFree ? 0 : this.price;
});

// Virtual for is on sale
modSchema.virtual('isPublished').get(function() {
  return this.status === 'published' || this.status === 'approved';
});

// Index for faster queries
modSchema.index({ slug: 1 });
modSchema.index({ status: 1 });
modSchema.index({ category: 1 });
modSchema.index({ author: 1 });
modSchema.index({ featured: 1 });
modSchema.index({ createdAt: -1 });
modSchema.index({ ratingsAverage: -1 });
modSchema.index({ downloads: -1 });
modSchema.index({ gameVersion: 1 });
modSchema.index({ fsVersion: 1 });

// Populate author virtual
modSchema.virtual('authorDetails', {
  ref: 'User',
  localField: 'author',
  foreignField: '_id'
});

// Populate category virtual
modSchema.virtual('categoryDetails', {
  ref: 'Category',
  localField: 'category',
  foreignField: '_id'
});

module.exports = mongoose.model('Mod', modSchema);
