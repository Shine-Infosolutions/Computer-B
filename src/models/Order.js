const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, sparse: true },
  quoteId: { type: String, unique: true, sparse: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String },
  customerPhone: { type: String },
  address: { type: String, required: true },
  type: {
    type: String,
    enum: ["Order", "Quotation"],
    default: "Order"
  },

  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true } // price at order time
    }
  ],

  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled"],
    default: "Pending"
  },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for soft delete queries
OrderSchema.index({ isDeleted: 1 });

// // Generate orderId and quoteId before saving
// OrderSchema.pre("save", async function (next) {
//   if (!this.orderId) {
//     this.orderId = await generateOrderId();
//   }
//   if (this.type === "Quotation" && !this.quoteId) {
//     this.quoteId = await generateQuoteId();
//   }
//   this.updatedAt = Date.now();
//   next();
// });

module.exports = mongoose.model("Order", OrderSchema);
