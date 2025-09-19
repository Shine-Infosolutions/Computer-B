const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, sparse: true, index: true },
  quoteId: { type: String, unique: true, sparse: true, index: true },
  customerName: { type: String, required: true, trim: true, index: true },
  customerEmail: { type: String, trim: true, lowercase: true },
  customerPhone: { type: String, trim: true },
  address: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["Order", "Quotation"],
    default: "Order",
    index: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled"],
    default: "Pending",
    index: true
  },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Compound indexes for better query performance
OrderSchema.index({ type: 1, isDeleted: 1, status: 1 });
OrderSchema.index({ customerName: 'text' });
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
