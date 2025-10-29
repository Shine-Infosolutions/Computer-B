const SubCategory = require("../models/SubCategory");
const Category = require("../models/Category");

// Create subcategory
exports.createSubCategory = async (req, res) => {
  try {
    const { name, category } = req.body;

    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subCategory = new SubCategory({ name, category });
    await subCategory.save();
    
    await subCategory.populate("category", "name");
    res.status(201).json(subCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SubCategory already exists in this category" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get all subcategories
exports.getAllSubCategories = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    
    const subCategories = await SubCategory.find(filter).populate("category", "name");
    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subcategory by ID
exports.getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id).populate("category", "name");
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }
    res.json(subCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update subcategory
exports.updateSubCategory = async (req, res) => {
  try {
    const { name, category } = req.body;

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({ message: "Category not found" });
      }
    }

    const subCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      { name, category },
      { new: true, runValidators: true }
    ).populate("category", "name");

    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    res.json(subCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SubCategory already exists in this category" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Delete subcategory
exports.deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await SubCategory.findByIdAndDelete(req.params.id);
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }
    res.json({ message: "SubCategory deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get categories for dropdown
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({}, "name").sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subcategories by category name
exports.getSubCategoriesByName = async (req, res) => {
  try {
    const { categoryName } = req.params;
    const category = await Category.findOne({ name: new RegExp(categoryName, 'i') });
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subCategories = await SubCategory.find({ category: category._id }, "name").sort({ name: 1 });
    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all categories with their subcategories
exports.getCategoriesWithSubCategories = async (req, res) => {
  try {
    const categories = await Category.find({}, "name").sort({ name: 1 });
    const result = [];

    for (const category of categories) {
      const subCategories = await SubCategory.find({ category: category._id }, "name").sort({ name: 1 });
      result.push({
        _id: category._id,
        name: category.name,
        subCategories
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};