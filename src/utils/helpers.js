const mongoose = require('mongoose');

// Validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Generate pagination metadata
const getPaginationMeta = (page, limit, total) => ({
  currentPage: Number(page),
  totalPages: Math.ceil(total / limit),
  total,
  hasNext: page * limit < total,
  hasPrev: page > 1
});

// Build search filter for text queries
const buildSearchFilter = (searchTerm, fields) => {
  if (!searchTerm?.trim()) return {};
  
  const regex = { $regex: searchTerm.trim(), $options: 'i' };
  return { $or: fields.map(field => ({ [field]: regex })) };
};

// Extract attribute value with fallback keys
const getAttributeValue = (product, keys) => {
  if (!product?.attributes) return null;
  
  for (const key of keys) {
    const value = product.attributes.get(key);
    if (value) return value.toString().toLowerCase().trim();
  }
  return null;
};

// Format attributes for storage
const formatAttributes = (attributes) => {
  if (!attributes || typeof attributes !== 'object') return undefined;
  
  const formatted = new Map();
  Object.entries(attributes).forEach(([key, value]) => {
    if (key?.trim() && value !== null && value !== undefined) {
      formatted.set(key.trim(), value);
    }
  });
  return formatted.size > 0 ? formatted : undefined;
};

// Error response helper
const sendError = (res, status, message, error = null) => {
  console.error(`Error ${status}:`, message, error?.message || '');
  res.status(status).json({ 
    success: false, 
    error: message,
    ...(process.env.NODE_ENV === 'development' && error && { details: error.message })
  });
};

// Success response helper
const sendSuccess = (res, data, message = null, meta = null) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  if (meta) response.meta = meta;
  res.json(response);
};

module.exports = {
  isValidObjectId,
  getPaginationMeta,
  buildSearchFilter,
  getAttributeValue,
  formatAttributes,
  sendError,
  sendSuccess
};