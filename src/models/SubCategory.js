const mongoose = require("mongoose");

const SubCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    index: true 
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique subcategory names within a category
SubCategorySchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("SubCategory", SubCategorySchema);