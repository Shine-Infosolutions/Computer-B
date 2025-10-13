const multer = require('multer');
const xlsx = require('xlsx');
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

// AI-powered attribute filling function
const fillAttributesWithAI = (productName, category) => {
  const attributes = {};
  const name = productName.toLowerCase();
  const cat = category.toLowerCase();

  // Extract brand from common patterns
  const brands = ['intel', 'amd', 'nvidia', 'asus', 'msi', 'gigabyte', 'asrock', 'corsair', 'kingston', 'samsung', 'western digital', 'seagate', 'crucial', 'g.skill', 'hyperx', 'cooler master', 'thermaltake', 'evga', 'zotac', 'sapphire'];
  for (const brand of brands) {
    if (name.includes(brand)) {
      attributes.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }

  // CPU attributes
  if (cat.includes('cpu') || cat.includes('processor')) {
    if (name.includes('intel')) {
      attributes.brand = 'Intel';
      if (name.includes('i3')) attributes.series = 'Core i3';
      else if (name.includes('i5')) attributes.series = 'Core i5';
      else if (name.includes('i7')) attributes.series = 'Core i7';
      else if (name.includes('i9')) attributes.series = 'Core i9';
      
      // Socket detection
      if (name.includes('lga1700') || name.includes('12th') || name.includes('13th') || name.includes('14th')) {
        attributes.socketType = 'LGA1700';
      } else if (name.includes('lga1200') || name.includes('10th') || name.includes('11th')) {
        attributes.socketType = 'LGA1200';
      } else if (name.includes('lga1151')) {
        attributes.socketType = 'LGA1151';
      }
      
      // Core count detection
      const coreMatch = name.match(/(\d+)\s*core/);
      if (coreMatch) attributes.cores = parseInt(coreMatch[1]);
      
      // Thread count detection
      const threadMatch = name.match(/(\d+)\s*thread/);
      if (threadMatch) attributes.threads = parseInt(threadMatch[1]);
      
    } else if (name.includes('amd')) {
      attributes.brand = 'AMD';
      if (name.includes('ryzen 3')) attributes.series = 'Ryzen 3';
      else if (name.includes('ryzen 5')) attributes.series = 'Ryzen 5';
      else if (name.includes('ryzen 7')) attributes.series = 'Ryzen 7';
      else if (name.includes('ryzen 9')) attributes.series = 'Ryzen 9';
      
      if (name.includes('am4')) attributes.socketType = 'AM4';
      else if (name.includes('am5')) attributes.socketType = 'AM5';
    }
    
    // Clock speed detection
    const clockMatch = name.match(/(\d+\.\d+)\s*ghz/);
    if (clockMatch) attributes.baseClock = clockMatch[1] + 'GHz';
  }

  // RAM attributes
  if (cat.includes('ram') || cat.includes('memory')) {
    if (name.includes('ddr4')) attributes.ramType = 'DDR4';
    else if (name.includes('ddr5')) attributes.ramType = 'DDR5';
    else if (name.includes('ddr3')) attributes.ramType = 'DDR3';
    
    // Capacity detection
    const capacityMatch = name.match(/(\d+)\s*gb/);
    if (capacityMatch) attributes.capacity = capacityMatch[1] + 'GB';
    
    // Speed detection
    const speedMatch = name.match(/(\d{4})/);
    if (speedMatch) attributes.speed = speedMatch[1] + 'MHz';
    
    // Kit detection
    if (name.includes('2x')) attributes.kit = '2x';
    else if (name.includes('4x')) attributes.kit = '4x';
    
    // Latency detection
    const latencyMatch = name.match(/cl(\d+)|c(\d+)/);
    if (latencyMatch) attributes.latency = 'CL' + (latencyMatch[1] || latencyMatch[2]);
  }

  // GPU attributes
  if (cat.includes('gpu') || cat.includes('graphics') || cat.includes('video card')) {
    if (name.includes('nvidia') || name.includes('rtx') || name.includes('gtx')) {
      attributes.brand = 'NVIDIA';
      
      // RTX series
      if (name.includes('rtx 4090')) attributes.model = 'RTX 4090';
      else if (name.includes('rtx 4080')) attributes.model = 'RTX 4080';
      else if (name.includes('rtx 4070')) attributes.model = 'RTX 4070';
      else if (name.includes('rtx 4060')) attributes.model = 'RTX 4060';
      else if (name.includes('rtx 3090')) attributes.model = 'RTX 3090';
      else if (name.includes('rtx 3080')) attributes.model = 'RTX 3080';
      else if (name.includes('rtx 3070')) attributes.model = 'RTX 3070';
      else if (name.includes('rtx 3060')) attributes.model = 'RTX 3060';
      
      // GTX series
      else if (name.includes('gtx 1660')) attributes.model = 'GTX 1660';
      else if (name.includes('gtx 1650')) attributes.model = 'GTX 1650';
      
    } else if (name.includes('amd') || name.includes('radeon') || name.includes('rx')) {
      attributes.brand = 'AMD';
      if (name.includes('rx 7900')) attributes.model = 'RX 7900';
      else if (name.includes('rx 7800')) attributes.model = 'RX 7800';
      else if (name.includes('rx 7700')) attributes.model = 'RX 7700';
      else if (name.includes('rx 6900')) attributes.model = 'RX 6900';
      else if (name.includes('rx 6800')) attributes.model = 'RX 6800';
      else if (name.includes('rx 6700')) attributes.model = 'RX 6700';
    }
    
    // VRAM detection
    const vramMatch = name.match(/(\d+)\s*gb/);
    if (vramMatch) attributes.vram = vramMatch[1] + 'GB';
    
    // Interface
    attributes.interface = 'PCIe';
  }

  // Motherboard attributes
  if (cat.includes('motherboard') || cat.includes('mobo')) {
    // Socket detection
    if (name.includes('lga1700')) attributes.socketType = 'LGA1700';
    else if (name.includes('lga1200')) attributes.socketType = 'LGA1200';
    else if (name.includes('lga1151')) attributes.socketType = 'LGA1151';
    else if (name.includes('am4')) attributes.socketType = 'AM4';
    else if (name.includes('am5')) attributes.socketType = 'AM5';
    
    // RAM support
    if (name.includes('ddr4')) attributes.ramType = 'DDR4';
    else if (name.includes('ddr5')) attributes.ramType = 'DDR5';
    
    // Form factor
    if (name.includes('atx') && !name.includes('micro') && !name.includes('mini')) attributes.formFactor = 'ATX';
    else if (name.includes('micro-atx') || name.includes('matx')) attributes.formFactor = 'Micro-ATX';
    else if (name.includes('mini-itx') || name.includes('mitx')) attributes.formFactor = 'Mini-ITX';
    
    // Chipset detection
    const chipsets = ['b550', 'x570', 'b450', 'x470', 'z690', 'z590', 'b560', 'h510', 'z790', 'b760'];
    for (const chipset of chipsets) {
      if (name.includes(chipset)) {
        attributes.chipset = chipset.toUpperCase();
        break;
      }
    }
  }

  // Storage attributes
  if (cat.includes('storage') || cat.includes('ssd') || cat.includes('hdd') || cat.includes('hard drive')) {
    // Capacity detection
    const capacityMatch = name.match(/(\d+)\s*(tb|gb)/);
    if (capacityMatch) {
      attributes.capacity = capacityMatch[1] + capacityMatch[2].toUpperCase();
    }
    
    // Type detection
    if (name.includes('ssd')) attributes.type = 'SSD';
    else if (name.includes('hdd') || name.includes('hard drive')) attributes.type = 'HDD';
    
    // Interface detection
    if (name.includes('nvme') || name.includes('m.2')) attributes.interface = 'NVMe M.2';
    else if (name.includes('sata')) attributes.interface = 'SATA';
    
    // Form factor for SSDs
    if (name.includes('2.5')) attributes.formFactor = '2.5"';
    else if (name.includes('3.5')) attributes.formFactor = '3.5"';
    else if (name.includes('m.2')) attributes.formFactor = 'M.2';
  }

  // PSU attributes
  if (cat.includes('psu') || cat.includes('power supply')) {
    // Wattage detection
    const wattageMatch = name.match(/(\d+)\s*w/);
    if (wattageMatch) attributes.wattage = wattageMatch[1] + 'W';
    
    // Efficiency rating
    if (name.includes('80+ gold')) attributes.efficiency = '80+ Gold';
    else if (name.includes('80+ bronze')) attributes.efficiency = '80+ Bronze';
    else if (name.includes('80+ silver')) attributes.efficiency = '80+ Silver';
    else if (name.includes('80+ platinum')) attributes.efficiency = '80+ Platinum';
    else if (name.includes('80+ titanium')) attributes.efficiency = '80+ Titanium';
    
    // Modular
    if (name.includes('modular')) attributes.modular = 'Yes';
    else if (name.includes('non-modular')) attributes.modular = 'No';
  }

  // Case attributes
  if (cat.includes('case') || cat.includes('cabinet')) {
    // Form factor support
    if (name.includes('atx')) attributes.formFactor = 'ATX';
    else if (name.includes('micro-atx')) attributes.formFactor = 'Micro-ATX';
    else if (name.includes('mini-itx')) attributes.formFactor = 'Mini-ITX';
    
    // Size
    if (name.includes('full tower')) attributes.size = 'Full Tower';
    else if (name.includes('mid tower')) attributes.size = 'Mid Tower';
    else if (name.includes('mini tower')) attributes.size = 'Mini Tower';
  }

  return attributes;
};

// Bulk import products from Excel
const bulkImportProducts = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No Excel file uploaded');
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log('Parsed Excel data:', data);

    if (!data.length) {
      return sendError(res, 400, 'Excel file is empty');
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
        if (!row.name || !row.sellingRate) {
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
        
        // AI-powered attribute filling
        const aiAttributes = fillAttributesWithAI(row.name, categoryName);
        
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