// src/models/bundle.model.js
const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bundle must have a name'],
    trim: true,
    maxlength: [100, 'Bundle name cannot exceed 100 characters'],
    minlength: [3, 'Bundle name must be at least 3 characters']
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  description: {
    type: String,
    required: [true, 'Bundle must have a description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  
  // Pricing
  originalPrice: {
    type: Number,
    required: [true, 'Bundle must have an original price'],
    min: [0, 'Price cannot be negative']
  },
  
  salePrice: {
    type: Number,
    min: [0, 'Sale price cannot be negative']
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Mods in Bundle
  mods: [{
    mod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mod',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Images
  coverImage: {
    type: String,
    required: [true, 'Bundle must have a cover image']
  },
  
  images: [{
    url: String,
    caption: String,
    order: Number
  }],
  
  // Category
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Game Compatibility
  gameVersions: [{
    type: String,
    trim: true
  }],
  
  // Author/Seller
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bundle must have an author']
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'unpublished', 'archived'],
    default: 'draft'
  },
  
  // Statistics
  totalSales: {
    type: Number,
    default: 0
  },
  
  totalRevenue: {
    type: Number,
    default: 0
  },
  
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  
  totalDownloads: {
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
  
  // Purchase Requirements
  requirements: {
    type: String,
    maxlength: [1000, 'Requirements cannot exceed 1000 characters']
  },
  
  // Featured
  isFeatured: {
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
bundleSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Calculate discount
  if (this.salePrice && this.originalPrice) {
    this.discount = Math.round(((this.originalPrice - this.salePrice) / this.originalPrice) * 100);
  }
  
  next();
});

// Calculate average rating before saving
bundleSchema.pre('save', async function(next) {
  if (this.reviews.length > 0) {
    const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = total / this.reviews.length;
    this.ratingsQuantity = this.reviews.length;
  }
  next();
});

// Add review method
bundleSchema.methods.addReview = async function(userId, rating, title, comment) {
  // Check if user already reviewed
  const existingReview = this.reviews.find(r => r.user.toString() === userId.toString());
  
  if (existingReview) {
    throw new Error('You have already reviewed this bundle');
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

// Increment sales method
bundleSchema.methods.incrementSales = async function(amount) {
  this.totalSales += 1;
  this.totalRevenue += amount;
  await this.save();
};

// Increment downloads method
bundleSchema.methods.incrementDownloads = async function() {
  this.totalDownloads += 1;
  await this.save();
};

// Virtual for current price
bundleSchema.virtual('currentPrice').get(function() {
  return this.salePrice || this.originalPrice;
});

// Virtual for is on sale
bundleSchema.virtual('isOnSale').get(function() {
  return this.salePrice && this.salePrice < this.originalPrice;
});

// Virtual for mod count
bundleSchema.virtual('modCount').get(function() {
  return this.mods.length;
});

// Index for faster queries
bundleSchema.index({ slug: 1 });
bundleSchema.index({ status: 1 });
bundleSchema.index({ category: 1 });
bundleSchema.index({ author: 1 });
bundleSchema.index({ isFeatured: 1 });
bundleSchema.index({ createdAt: -1 });
bundleSchema.index({ averageRating: -1 });
bundleSchema.index({ totalSales: -1 });

// Populate mods virtual
bundleSchema.virtual('modDetails', {
  ref: 'Mod',
  localField: 'mods.mod',
  foreignField: '_id'
});

module.exports = mongoose.model('Bundle', bundleSchema);
