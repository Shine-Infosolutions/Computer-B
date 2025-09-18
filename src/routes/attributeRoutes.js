const express = require("express");
const multer = require('multer');
const path = require('path');
const router = express.Router();
const attributeController = require("../controllers/attributeController");

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get attribute templates for all categories
router.get("/templates", attributeController.getAttributeTemplates);

// Get attributes by category ID
router.get("/category/:categoryId/attributes", attributeController.getAttributesByCategoryId);

// Get products by category with attributes
router.get("/category/:categoryId/products", attributeController.getProductsByCategory);

// Add attribute values to product
router.put("/product/:productId/attributes", attributeController.addAttributeValues);



// Extract attributes from image (URL or upload)
router.post("/extract-from-image", upload.single('image'), attributeController.extractAttributesFromImage);

module.exports = router;