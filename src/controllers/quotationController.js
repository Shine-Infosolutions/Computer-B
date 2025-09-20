const Quotation = require("../models/Quotation");
const Cart = require("../models/Cart");

// Get all quotations (excluding soft deleted)
const getQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find({ isDeleted: false })
      .populate("items.product")
      .sort({ createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single quotation
const getQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).populate("items.product");
    
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json(quotation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create quotation
const createQuotation = async (req, res) => {
  try {
    const quotation = new Quotation(req.body);
    await quotation.save();
    
    // Clear cart after successful quotation creation
    await Cart.findOneAndUpdate(
      { cartId: 'global' },
      { items: [], totalAmount: 0 }
    );
    
    res.status(201).json(quotation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update quotation
const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { new: true }
    );
    
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json(quotation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Soft delete quotation
const deleteQuotation = async (req, res) => {
  try {
    console.log("Attempting to delete quotation ID:", req.params.id);
    
    // First check if quotation exists
    const existingQuotation = await Quotation.findById(req.params.id);
    console.log("Found quotation:", existingQuotation);
    
    if (!existingQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    
    if (existingQuotation.isDeleted) {
      return res.status(400).json({ message: "Quotation already deleted" });
    }
    
    // Soft delete the quotation
    await Quotation.findByIdAndUpdate(
      req.params.id,
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      }
    );
    
    res.json({ message: "Quotation deleted successfully" });
  } catch (error) {
    console.log("Delete error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get soft deleted quotations
const getDeletedQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find({ isDeleted: true })
      .populate("items.product")
      .sort({ deletedAt: -1 });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



module.exports = {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getDeletedQuotations
};