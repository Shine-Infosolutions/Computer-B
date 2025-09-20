const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  totalAmount: { type: Number, default: 0, min: 0 },
  expiresAt: { 
    type: Date, 
    default: Date.now, 
    expires: 604800 // 7 days in seconds
  }
}, {
  timestamps: true
});

CartSchema.index({ sessionId: 1 });

module.exports = mongoose.model("Cart", CartSchema);