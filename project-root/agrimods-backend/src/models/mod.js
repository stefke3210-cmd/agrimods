const mongoose = require('mongoose');

const modSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: String,
  version: { type: String, default: '1.0.0' },
  compatibleWith: [{ type: String, enum: ['FS22', 'FS25'] }],
  price: { type: Number, required: true, min: 0 },
  fileUrl: { type: String, required: true }, // Path in uploads/mods/
  fileName: { type: String, required: true },
  previewImageUrl: String,
  downloadCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mod', modSchema);
