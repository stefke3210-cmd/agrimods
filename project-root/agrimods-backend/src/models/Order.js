const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    type: {
      type: String,
      enum: ['mod', 'bundle'],
      required: true
    },
    item: mongoose.Schema.Types.ObjectId,
    bundleType: String, // For bundles
    name: String,
    price: Number,
    quantity: { type: Number, default: 1 }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['paypal', 'stripe'],
    required: true
  },
  paypalSaleId: String,
  processedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);