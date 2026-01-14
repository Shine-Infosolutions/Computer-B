const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category", 
    required: true,
    index: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubCategory",
    index: true
  },
  brand: { type: String, trim: true, index: true },
  modelNumber: { type: String, trim: true },
  quantity: { type: Number, default: 0, min: 0 },
  sellingRate: { type: Number, required: true, min: 0 },
  costRate: { type: Number, min: 0 },
  status: { 
    type: String, 
    enum: ["Active", "Inactive", "Out of Stock"], 
    default: "Active",
    index: true
  },
  warranty: { type: String, trim: true },
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  compatibleWith: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product" 
  }]
}, {
  timestamps: true
});

// Compound indexes for better query performance
ProductSchema.index({ name: 'text', brand: 'text' });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ sellingRate: 1 });

module.exports = mongoose.model("Product", ProductSchema);
