const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
  cartId: { type: String, default: 'global', index: true },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  totalAmount: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
});

CartSchema.index({ cartId: 1 });

module.exports = mongoose.model("Cart", CartSchema);