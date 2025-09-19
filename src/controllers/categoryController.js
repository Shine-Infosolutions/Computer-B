const Category = require('../models/Category');
const { isValidObjectId, sendError, sendSuccess } = require('../utils/helpers');

exports.addCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    sendSuccess(res, category, 'Category created successfully');
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 400, 'Category name already exists');
    }
    sendError(res, 500, 'Failed to create category', err);
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    sendSuccess(res, categories);
  } catch (err) {
    sendError(res, 500, 'Failed to fetch categories', err);
  }
};

exports.getCategory = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid category ID');
    }
    
    const category = await Category.findById(req.params.id).lean();
    if (!category) return sendError(res, 404, 'Category not found');
    
    sendSuccess(res, category);
  } catch (err) {
    sendError(res, 500, 'Failed to fetch category', err);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid category ID');
    }
    
    const category = await Category.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).lean();
    
    if (!category) return sendError(res, 404, 'Category not found');
    
    sendSuccess(res, category, 'Category updated successfully');
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 400, 'Category name already exists');
    }
    sendError(res, 500, 'Failed to update category', err);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid category ID');
    }
    
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return sendError(res, 404, 'Category not found');
    
    sendSuccess(res, null, 'Category deleted successfully');
  } catch (err) {
    sendError(res, 500, 'Failed to delete category', err);
  }
};