const express = require("express");
const router = express.Router();
const attributeController = require("../controllers/attributeController");

// Get attribute templates for all categories
router.get("/templates", attributeController.getAttributeTemplates);

// Get attributes by category ID
router.get("/category/:categoryId/attributes", attributeController.getAttributesByCategoryId);

// Get products by category with attributes
router.get("/category/:categoryId/products", attributeController.getProductsByCategory);

// Add attribute values to product
router.put("/product/:productId/attributes", attributeController.addAttributeValues);

module.exports = router;