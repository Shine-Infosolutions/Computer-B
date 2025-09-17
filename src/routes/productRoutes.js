const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

router.post("/create", productController.createProduct);

// Compatibility
// router.get('/:id/compatible', productController.getCompatibleProducts);
router.get('/compatibility/all', productController.getAllCompatibleProducts);
router.get('/compatibility/builds', productController.getCompatibleBuilds);
router.get('/:id/builds', productController.getBuildsForProduct);
router.post('/compatibility/sequential', productController.getSequentialCompatibility);

// Search
router.get("/search", productController.searchProducts);

// Read
router.get("/all", productController.getAllProducts);
router.get("/get/:id", productController.getProductById);
router.get("/category/:categoryId", productController.getProductsByCategory);

router.get("/export/csv", productController.exportProductsCSV);

// Update
router.put("/update/:id", productController.updateProduct);

// Delete
router.delete("/delete/:id", productController.deleteProduct);

module.exports = router;
