const express = require('express');
const { bulkImportProducts, createSelectedProducts, downloadTemplate, upload } = require('../controllers/bulkImportController');

const router = express.Router();

// POST /api/bulk-import/products - Upload Excel file and preview products
router.post('/products', upload.single('excelFile'), bulkImportProducts);

// POST /api/bulk-import/create - Create selected products
router.post('/create', createSelectedProducts);

// GET /api/bulk-import/template - Download Excel template
router.get('/template', downloadTemplate);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Bulk import routes are working!', timestamp: new Date().toISOString() });
});

module.exports = router;