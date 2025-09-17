const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  // 🔹 Basic Info
  name: { type: String, required: true },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category", 
    required: true 
  },
  brand: { type: String },
  modelNumber: { type: String },

  // 🔹 Pricing & Stock
  quantity: { type: Number, default: 0 },
  sellingRate: { type: Number, required: true },
  costRate: { type: Number },

  // 🔹 Status
  status: { 
    type: String, 
    enum: ["Active", "Inactive", "Out of Stock"], 
    default: "Active" 
  },

  warranty: { type: String },

  // 🔹 Dynamic attributes (specifications)
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
    // Example: { "Socket": "AM4", "RAM Type": "DDR4", "PCIe Version": "4.0" }
  },

  // 🔹 Tracking
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto update `updatedAt` on save
ProductSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Product", ProductSchema);
