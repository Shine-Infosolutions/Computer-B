const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// Static routes first
router.post("/create", productController.createProduct);
router.post("/scrape", productController.scrapeProductData);
router.get("/search", productController.searchProducts);
router.get("/all", productController.getAllProducts);
router.get("/export/csv", productController.exportProductsCSV);
router.get('/compatibility/all', productController.getAllCompatibleProducts);
router.get('/compatibility/builds', productController.getCompatibleBuilds);
router.post('/compatibility/sequential', productController.getSequentialCompatibility);

// Dynamic routes last
router.get("/get/:id", productController.getProductById);
router.get("/category/:categoryId", productController.getProductsByCategory);
router.get('/:id/builds', productController.getBuildsForProduct);
router.put("/update/:id", productController.updateProduct);
router.delete("/delete/:id", productController.deleteProduct);

module.exports = router;
