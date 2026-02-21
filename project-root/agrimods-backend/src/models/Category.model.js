// src/models/Category.model.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category must have a name'],
    unique: true,
    trim: true
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  
  description: String,
  
  icon: String,
  
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  
  modCount: {
    type: Number,
    default: 0
  },
  
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

categorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
