const multer = require('multer');
const xlsx = require('xlsx');
const axios = require('axios');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { sendError, sendSuccess } = require('../utils/helpers');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Simple attribute extraction without AI (fallback)
const fillAttributesWithAI = async (productName, categoryId) => {
  try {
    // Get category attributes from backend first
    let existingAttributes = {};
    
    try {
      const response = await axios.get(`https://computer-b.vercel.app/api/attributes/category/${categoryId}/attributes`);
      if (response.data && response.data.attributes) {
        existingAttributes = response.data.attributes;
      }
    } catch (error) {
      // No existing attributes
    }

    // Return empty object - AI generation will happen on frontend
    return {};
  } catch (error) {
    console.error('Attribute processing failed:', error.message);
    return {};
  }
};

// Bulk import products from Excel or manual data
const bulkImportProducts = async (req, res) => {
  try {
    let data = [];
    
    // Check if it's manual data or Excel file
    if (req.body.manualData) {
      data = req.body.manualData;
      console.log('Processing manual data:', data);
    } else if (req.file) {
      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(worksheet);
      console.log('Parsed Excel data:', data);
    } else {
      return sendError(res, 400, 'No Excel file uploaded or manual data provided');
    }

    if (!data.length) {
      return sendError(res, 400, 'No data to process');
    }

    const results = {
      success: [],
      errors: [],
      total: data.length
    };

    // Get selected category or all categories for mapping
    const selectedCategoryId = req.body.categoryId;
    let categoryMap = {};
    
    if (selectedCategoryId) {
      // Use the selected category for all products
      const selectedCategory = await Category.findById(selectedCategoryId).lean();
      if (!selectedCategory) {
        return sendError(res, 400, 'Selected category not found');
      }
      categoryMap[selectedCategory.name.toLowerCase()] = selectedCategory._id;
    } else {
      // Get all categories for mapping (fallback)
      const categories = await Category.find().lean();
      categories.forEach(cat => {
        categoryMap[cat.name.toLowerCase()] = cat._id;
      });
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Required fields validation
        if (!row.name || row.sellingRate === undefined || row.sellingRate === null) {
          results.errors.push({
            row: i + 2,
            error: `Missing required fields: name=${row.name}, sellingRate=${row.sellingRate}`
          });
          continue;
        }

        // Use selected category or find from Excel
        let categoryId;
        if (selectedCategoryId) {
          categoryId = selectedCategoryId;
        } else {
          categoryId = categoryMap[row.category?.toLowerCase()];
          if (!categoryId) {
            results.errors.push({
              row: i + 2,
              error: `Category '${row.category}' not found`
            });
            continue;
          }
        }

        // Get category name for AI processing
        const categoryName = selectedCategoryId ? 
          (await Category.findById(selectedCategoryId).lean())?.name || '' : 
          row.category || '';
        
        // Get category attributes (AI will be handled by frontend)
        const aiAttributes = await fillAttributesWithAI(row.name, categoryId);
        
        // Merge manual attributes with AI attributes
        const finalAttributes = { ...aiAttributes };
        
        // Add any additional attributes from Excel columns
        Object.keys(row).forEach(key => {
          if (!['name', 'category', 'brand', 'modelNumber', 'quantity', 'sellingRate', 'costRate', 'status', 'warranty'].includes(key)) {
            if (row[key] && row[key].toString().trim()) {
              finalAttributes[key] = row[key];
            }
          }
        });

        // Create product data
        const productData = {
          name: row.name.trim(),
          category: categoryId,
          brand: row.brand || aiAttributes.brand || '',
          modelNumber: row.modelNumber || '',
          quantity: parseInt(row.quantity) || 0,
          sellingRate: parseFloat(row.sellingRate),
          costRate: parseFloat(row.costRate) || 0,
          status: row.status || 'Active',
          warranty: row.warranty || '',
          attributes: finalAttributes
        };

        // Preview product (don't create yet)
        results.success.push({
          row: i + 2,
          productData: productData,
          name: productData.name,
          attributesAdded: Object.keys(finalAttributes).length
        });

      } catch (error) {
        results.errors.push({
          row: i + 2,
          error: error.message
        });
      }
    }

    sendSuccess(res, results, `Bulk import preview completed. ${results.success.length} products ready to add, ${results.errors.length} errors`);

  } catch (error) {
    sendError(res, 500, 'Failed to process bulk import', error);
  }
};

// Download sample Excel template
const downloadTemplate = (req, res) => {
  try {
    const sampleData = [
      {
        name: 'Intel Core i5-12400F',
        category: 'CPU',
        brand: 'Intel',
        modelNumber: 'i5-12400F',
        quantity: 10,
        sellingRate: 15000,
        costRate: 12000,
        status: 'Active',
        warranty: '3 years',
        // Additional attributes will be filled by AI
        cores: 6,
        threads: 12,
        baseClock: '2.5GHz'
      },
      {
        name: 'Corsair Vengeance LPX 16GB DDR4-3200',
        category: 'RAM',
        brand: 'Corsair',
        modelNumber: 'CMK16GX4M2B3200C16',
        quantity: 25,
        sellingRate: 5500,
        costRate: 4500,
        status: 'Active',
        warranty: 'Lifetime'
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    sendError(res, 500, 'Failed to generate template', error);
  }
};

// Create selected products from preview
const createSelectedProducts = async (req, res) => {
  try {
    const { selectedProducts } = req.body;
    
    if (!selectedProducts || !selectedProducts.length) {
      return sendError(res, 400, 'No products selected');
    }

    const results = {
      success: [],
      errors: []
    };

    for (const productData of selectedProducts) {
      try {
        const product = await Product.create(productData);
        results.success.push({
          productId: product._id,
          name: product.name
        });
      } catch (error) {
        results.errors.push({
          name: productData.name,
          error: error.message
        });
      }
    }

    sendSuccess(res, results, `${results.success.length} products created successfully`);
  } catch (error) {
    sendError(res, 500, 'Failed to create products', error);
  }
};

module.exports = {
  upload,
  bulkImportProducts,
  createSelectedProducts,
  downloadTemplate
};