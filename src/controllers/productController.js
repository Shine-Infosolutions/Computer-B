const { Parser } = require("json2csv");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { 
  isValidObjectId, 
  getPaginationMeta, 
  buildSearchFilter, 
  getAttributeValue, 
  formatAttributes, 
  sendError, 
  sendSuccess 
} = require('../utils/helpers');
const https = require('https');
const http = require('http');

exports.createProduct = async (req, res) => {
  try {
    const { name, category, sellingRate, attributes } = req.body;

    if (!name?.trim() || !category || !sellingRate) {
      return sendError(res, 400, "Name, Category, and Selling Rate are required");
    }

    if (!isValidObjectId(category)) {
      return sendError(res, 400, "Invalid category ID");
    }

    const categoryExists = await Category.findById(category).lean();
    if (!categoryExists) return sendError(res, 400, "Category not found");

    const productData = {
      ...req.body,
      attributes: formatAttributes(attributes)
    };

    const product = await Product.create(productData);
    sendSuccess(res, product, "Product created successfully");
  } catch (error) {
    sendError(res, 500, "Failed to create product", error);
  }
};

exports.getCompatibleProducts = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid product ID');
    }

    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .lean();
      
    if (!product) return sendError(res, 404, 'Product not found');
    
    if (!product.attributes || product.attributes.size === 0) {
      return sendSuccess(res, { product, compatibleProducts: [] }, 'No attributes to match');
    }

    const allProducts = await Product.find({ _id: { $ne: product._id } })
      .populate('category', 'name')
      .lean();
    
    const compatibleProducts = allProducts
      .filter(p => {
        if (!p.attributes || p.attributes.size === 0) return false;
        
        for (const [key, value] of Object.entries(product.attributes)) {
          if (p.attributes[key] && 
              p.attributes[key].toString().toLowerCase() === value?.toString().toLowerCase()) {
            return true;
          }
        }
        return false;
      })
      .map(p => ({
        ...p,
        matchingAttributes: Object.entries(product.attributes)
          .filter(([key, value]) => 
            p.attributes[key] && 
            p.attributes[key].toString().toLowerCase() === value?.toString().toLowerCase()
          )
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      }));

    sendSuccess(res, { product, compatibleProducts });
  } catch (err) {
    sendError(res, 500, 'Failed to find compatible products', err);
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (q?.trim()) {
      const searchNum = parseFloat(q);
      const textFilter = buildSearchFilter(q, ['name', 'brand']);
      
      const categories = await Category.find(
        { name: { $regex: q.trim(), $options: 'i' } },
        '_id'
      ).lean();
      
      filter = {
        $or: [
          ...textFilter.$or || [],
          ...(categories?.length ? [{ category: { $in: categories.map(c => c._id) } }] : []),
          ...(searchNum ? [{ sellingRate: searchNum }] : [])
        ]
      };
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter)
    ]);

    const meta = getPaginationMeta(page, limit, total);
    sendSuccess(res, products, null, meta);
  } catch (error) {
    sendError(res, 500, 'Failed to search products', error);
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find()
        .populate('category', 'name')
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments()
    ]);

    const meta = getPaginationMeta(page, limit, total);
    sendSuccess(res, products, null, meta);
  } catch (error) {
    sendError(res, 500, 'Failed to fetch products', error);
  }
};

exports.getProductById = async (req, res) => {
  try {
    console.log('🔍 GET PRODUCT BY ID - Requested ID:', req.params.id);
    
    if (!isValidObjectId(req.params.id)) {
      console.log('❌ Invalid ObjectId format:', req.params.id);
      return sendError(res, 400, 'Invalid product ID');
    }
    
    // Log all available product IDs for debugging
    const allProducts = await Product.find({}, '_id name').lean();
    console.log('📋 All available products:');
    allProducts.forEach(p => console.log(`  - ID: ${p._id}, Name: ${p.name}`));
    
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .lean();
      
    if (!product) {
      console.log('❌ Product not found with ID:', req.params.id);
      return sendError(res, 404, 'Product not found');
    }
    
    console.log('✅ Product found:', product.name);
    sendSuccess(res, product);
  } catch (error) {
    console.log('💥 Error in getProductById:', error.message);
    sendError(res, 500, 'Failed to fetch product', error);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    console.log('🔄 UPDATE PRODUCT - Requested ID:', req.params.id);
    console.log('📝 Update data:', JSON.stringify(req.body, null, 2));
    
    if (!isValidObjectId(req.params.id)) {
      console.log('❌ Invalid ObjectId format:', req.params.id);
      return sendError(res, 400, 'Invalid product ID');
    }

    // Log all available product IDs for debugging
    const allProducts = await Product.find({}, '_id name').lean();
    console.log('📋 All available products:');
    allProducts.forEach(p => console.log(`  - ID: ${p._id}, Name: ${p.name}`));
    
    // Check if product exists before update
    const existingProduct = await Product.findById(req.params.id).lean();
    if (!existingProduct) {
      console.log('❌ Product not found for update with ID:', req.params.id);
      return sendError(res, 404, 'Product not found');
    }
    
    console.log('✅ Product found for update:', existingProduct.name);

    const { attributes, ...rest } = req.body;
    const updateData = {
      ...rest,
      ...(attributes && { attributes: formatAttributes(attributes) })
    };

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name').lean();

    if (!product) {
      console.log('❌ Product update failed - not found after update');
      return sendError(res, 404, 'Product not found');
    }

    console.log('✅ Product updated successfully:', product.name);
    sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    console.log('💥 Error in updateProduct:', error.message);
    sendError(res, 500, 'Failed to update product', error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid product ID');
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return sendError(res, 404, 'Product not found');
    
    sendSuccess(res, null, 'Product deleted successfully');
  } catch (error) {
    sendError(res, 500, 'Failed to delete product', error);
  }
};

// ✅ Get Products by Category with Attributes
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const products = await Product.find({ category: categoryId }).populate("category");
    
    if (!products.length) {
      return res.status(404).json({ message: "No products found for this category" });
    }

    // Extract all unique attributes from products in this category
    const allAttributes = new Set();
    products.forEach(product => {
      if (product.attributes) {
        for (let key of product.attributes.keys()) {
          allAttributes.add(key);
        }
      }
    });

    res.json({
      category: products[0].category,
      products,
      availableAttributes: Array.from(allAttributes)
    });
  } catch (error) {
    res.status(500).json({ error: "Server error while fetching products by category" });
  }
};



// ✅ Get All Compatible Products
exports.getAllCompatibleProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    const compatibilityMap = new Map();

    for (const product of products) {
      if (!product.attributes || product.attributes.size === 0) continue;
      
      const compatible = products.filter(p => {
        if (p._id.toString() === product._id.toString() || !p.attributes || p.attributes.size === 0) return false;
        
        // Check if any attribute matches
        for (const [key, value] of product.attributes) {
          if (p.attributes.has(key) && p.attributes.get(key)?.toString().toLowerCase() === value?.toString().toLowerCase()) {
            return true;
          }
        }
        return false;
      }).map(c => ({
        _id: c._id,
        name: c.name,
        category: c.category.name,
        brand: c.brand,
        matchingAttributes: Array.from(product.attributes.entries()).filter(([key, value]) => 
          c.attributes.has(key) && c.attributes.get(key)?.toString().toLowerCase() === value?.toString().toLowerCase()
        ).map(([key, value]) => ({ [key]: value }))
      }));

      if (compatible.length > 0) {
        compatibilityMap.set(product._id.toString(), {
          product: {
            _id: product._id,
            name: product.name,
            category: product.category.name,
            brand: product.brand
          },
          compatibleWith: compatible
        });
      }
    }

    res.json({
      totalProducts: products.length,
      productsWithCompatibility: compatibilityMap.size,
      compatibility: Array.from(compatibilityMap.values())
    });
  } catch (error) {
    console.error('Error getting all compatible products:', error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get Compatible PC Builds
exports.getCompatibleBuilds = async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    
    const cpus = products.filter(p => p.category.name.toLowerCase() === 'cpu');
    const rams = products.filter(p => p.category.name.toLowerCase() === 'ram');
    const gpus = products.filter(p => p.category.name.toLowerCase() === 'gpu');
    const motherboards = products.filter(p => p.category.name.toLowerCase() === 'motherboard');
    
    const getAttr = (product, keys) => {
      if (!product.attributes) return null;
      for (const key of keys) {
        const value = product.attributes.get(key);
        if (value) return value.toLowerCase();
      }
      return null;
    };
    
    const builds = [];
    
    motherboards.forEach(mb => {
      const mbSocket = getAttr(mb, ['socketType', 'socket']);
      const mbRam = getAttr(mb, ['ramType', 'memoryType']);
      const mbPcie = getAttr(mb, ['pcieVersion', 'pcie']);
      
      const compatibleCpus = cpus.filter(cpu => {
        const cpuSocket = getAttr(cpu, ['socketType', 'socket']);
        return cpuSocket && cpuSocket === mbSocket;
      });
      
      const compatibleRams = rams.filter(ram => {
        const ramType = getAttr(ram, ['ramType', 'memoryType']);
        return ramType && ramType === mbRam;
      });
      
      const compatibleGpus = gpus.filter(gpu => {
        const gpuPcie = getAttr(gpu, ['pcieVersion', 'pcie']);
        return gpuPcie && gpuPcie === mbPcie;
      });
      
      if (compatibleCpus.length && compatibleRams.length && compatibleGpus.length) {
        builds.push({
          motherboard: { _id: mb._id, name: mb.name, brand: mb.brand },
          compatibleCpus: compatibleCpus.map(c => ({ _id: c._id, name: c.name, brand: c.brand })),
          compatibleRams: compatibleRams.map(r => ({ _id: r._id, name: r.name, brand: r.brand })),
          compatibleGpus: compatibleGpus.map(g => ({ _id: g._id, name: g.name, brand: g.brand }))
        });
      }
    });
    
    res.json({ totalBuilds: builds.length, builds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get Compatible Builds for Selected Product
exports.getBuildsForProduct = async (req, res) => {
  try {
    const selectedProduct = await Product.findById(req.params.id).populate("category");
    if (!selectedProduct) return res.status(404).json({ message: "Product not found" });
    
    const products = await Product.find({ _id: { $ne: selectedProduct._id } }).populate("category");
    const category = selectedProduct.category.name.toLowerCase();
    
    const getAttr = (product, keys) => {
      if (!product.attributes) return null;
      for (const key of keys) {
        const value = product.attributes.get(key);
        if (value) return value.toLowerCase();
      }
      return null;
    };
    
    const cpus = products.filter(p => p.category.name.toLowerCase() === 'cpu');
    const rams = products.filter(p => p.category.name.toLowerCase() === 'ram');
    const gpus = products.filter(p => p.category.name.toLowerCase() === 'gpu');
    const motherboards = products.filter(p => p.category.name.toLowerCase() === 'motherboard');
    
    let builds = [];
    
    if (category === 'motherboard') {
      const mbSocket = getAttr(selectedProduct, ['socketType', 'socket']);
      const mbRam = getAttr(selectedProduct, ['ramType', 'memoryType']);
      const mbPcie = getAttr(selectedProduct, ['pcieVersion', 'pcie']);
      
      const compatibleCpus = cpus.filter(cpu => getAttr(cpu, ['socketType', 'socket']) === mbSocket);
      const compatibleRams = rams.filter(ram => getAttr(ram, ['ramType', 'memoryType']) === mbRam);
      const compatibleGpus = gpus.filter(gpu => getAttr(gpu, ['pcieVersion', 'pcie']) === mbPcie);
      
      builds.push({
        selectedProduct: { _id: selectedProduct._id, name: selectedProduct.name, category: selectedProduct.category.name },
        compatibleCpus, compatibleRams, compatibleGpus
      });
    } else {
      const selectedAttr = category === 'cpu' ? getAttr(selectedProduct, ['socketType', 'socket']) :
                          category === 'ram' ? getAttr(selectedProduct, ['ramType', 'memoryType']) :
                          category === 'gpu' ? getAttr(selectedProduct, ['pcieVersion', 'pcie']) : null;
      
      const compatibleMbs = motherboards.filter(mb => {
        if (category === 'cpu') return getAttr(mb, ['socketType', 'socket']) === selectedAttr;
        if (category === 'ram') return getAttr(mb, ['ramType', 'memoryType']) === selectedAttr;
        if (category === 'gpu') return getAttr(mb, ['pcieVersion', 'pcie']) === selectedAttr;
        return false;
      });
      
      compatibleMbs.forEach(mb => {
        const mbSocket = getAttr(mb, ['socketType', 'socket']);
        const mbRam = getAttr(mb, ['ramType', 'memoryType']);
        const mbPcie = getAttr(mb, ['pcieVersion', 'pcie']);
        
        const otherCpus = category !== 'cpu' ? cpus.filter(cpu => getAttr(cpu, ['socketType', 'socket']) === mbSocket) : [];
        const otherRams = category !== 'ram' ? rams.filter(ram => getAttr(ram, ['ramType', 'memoryType']) === mbRam) : [];
        const otherGpus = category !== 'gpu' ? gpus.filter(gpu => getAttr(gpu, ['pcieVersion', 'pcie']) === mbPcie) : [];
        
        builds.push({
          selectedProduct: { _id: selectedProduct._id, name: selectedProduct.name, category: selectedProduct.category.name },
          motherboard: { _id: mb._id, name: mb.name, brand: mb.brand },
          compatibleCpus: otherCpus.map(c => ({ _id: c._id, name: c.name, brand: c.brand })),
          compatibleRams: otherRams.map(r => ({ _id: r._id, name: r.name, brand: r.brand })),
          compatibleGpus: otherGpus.map(g => ({ _id: g._id, name: g.name, brand: g.brand }))
        });
      });
    }
    
    res.json({ selectedProduct: selectedProduct.name, totalBuilds: builds.length, builds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get Compatible Products for Sequential Selection
exports.getSequentialCompatibility = async (req, res) => {
  try {
    const { selectedProducts } = req.body; // Array of selected product IDs
    
    if (!selectedProducts || !selectedProducts.length) {
      return res.status(400).json({ message: "No products selected" });
    }

    const selected = await Product.find({ _id: { $in: selectedProducts } }).populate("category");
    const allProducts = await Product.find({ _id: { $nin: selectedProducts } }).populate("category");
    
    const getAttr = (product, keys) => {
      if (!product.attributes) return null;
      for (const key of keys) {
        const value = product.attributes.get(key);
        if (value) return value.toLowerCase();
      }
      return null;
    };

    const selectedCategories = selected.map(p => p.category.name.toLowerCase());
    const hasCpu = selectedCategories.includes('cpu');
    const hasMotherboard = selectedCategories.includes('motherboard');

    let compatibleProducts = [];

    if (hasCpu && hasMotherboard) {
      // Both CPU and motherboard selected - check compatibility with remaining devices
      const motherboard = selected.find(p => p.category.name.toLowerCase() === 'motherboard');
      const mbRam = getAttr(motherboard, ['ramType', 'memoryType']);
      const mbPcie = getAttr(motherboard, ['pcieVersion', 'pcie']);
      
      compatibleProducts = allProducts.filter(product => {
        const category = product.category.name.toLowerCase();
        if (category === 'ram') {
          return getAttr(product, ['ramType', 'memoryType']) === mbRam;
        }
        if (category === 'gpu') {
          return getAttr(product, ['pcieVersion', 'pcie']) === mbPcie;
        }
        return false;
      });
    } else if (hasMotherboard) {
      // Only motherboard selected - show compatible devices
      const motherboard = selected.find(p => p.category.name.toLowerCase() === 'motherboard');
      const mbSocket = getAttr(motherboard, ['socketType', 'socket']);
      const mbRam = getAttr(motherboard, ['ramType', 'memoryType']);
      const mbPcie = getAttr(motherboard, ['pcieVersion', 'pcie']);
      
      compatibleProducts = allProducts.filter(product => {
        const category = product.category.name.toLowerCase();
        if (category === 'cpu') {
          const cpuSocket = getAttr(product, ['socketType', 'socket']);
          return mbSocket && cpuSocket && mbSocket.trim() === cpuSocket.trim();
        }
        if (category === 'ram') {
          const mbRamType = getAttr(motherboard, ['RamType', 'ramType']);
          const mbRamCapacity = getAttr(motherboard, ['RamMemoryCapacity']);
          const mbRamSpeed = getAttr(motherboard, ['RamSpeed']);
          
          const ramType = getAttr(product, ['RamType', 'ramType']);
          const ramCapacity = getAttr(product, ['RamMemoryCapacity']);
          const ramSpeed = getAttr(product, ['RamSpeed']);
          
          return (mbRamType && ramType && mbRamType === ramType) ||
                 (mbRamCapacity && ramCapacity && mbRamCapacity === ramCapacity) ||
                 (mbRamSpeed && ramSpeed && mbRamSpeed === ramSpeed);
        }
        if (category === 'gpu') {
          const mbPcieInterface = getAttr(motherboard, ['pcieInterface', 'pcieVersion', 'pcie']);
          const gpuPcieInterface = getAttr(product, ['pcieInterface', 'pcieVersion', 'pcie']);
          
          return mbPcieInterface && gpuPcieInterface && mbPcieInterface === gpuPcieInterface;
        }
        if (category === 'psu') {
          const mbWattage = getAttr(motherboard, ['wattage']);
          const psuWattage = getAttr(product, ['wattage']);
          
          if (mbWattage && psuWattage) {
            const mbWatts = parseInt(mbWattage.toString().replace(/\D/g, ''));
            const psuWatts = parseInt(psuWattage.toString().replace(/\D/g, ''));
            return !isNaN(mbWatts) && !isNaN(psuWatts) && psuWatts >= mbWatts;
          }
          return false;
        }
        if (category === 'storage') {
          const mbStorageType = getAttr(motherboard, ['Storagetype']);
          const storageType = getAttr(product, ['Storagetype']);
          
          return mbStorageType && storageType && mbStorageType === storageType;
        }
        return false;
      });
    } else if (hasCpu) {
      // Only CPU selected - show compatible motherboards
      const cpu = selected.find(p => p.category.name.toLowerCase() === 'cpu');
      const cpuSocket = getAttr(cpu, ['socketType', 'socket']);
      
      compatibleProducts = allProducts.filter(product => {
        if (product.category.name.toLowerCase() === 'motherboard') {
          const mbSocket = getAttr(product, ['socketType', 'socket']);
          return cpuSocket && mbSocket && cpuSocket.trim() === mbSocket.trim();
        }
        return false;
      });
    } else {
      // No key components selected - show all products
      compatibleProducts = allProducts;
    }

    res.json({
      selectedProducts: selected.map(p => ({ _id: p._id, name: p.name, category: p.category.name })),
      compatibleProducts: compatibleProducts.map(p => ({ _id: p._id, name: p.name, category: p.category.name, brand: p.brand }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Export Products CSV
exports.exportProductsCSV = async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    if (!products.length) return res.status(404).json({ message: "No products found" });

    const fields = [
      { label: "ID", value: "_id" },
      { label: "Name", value: "name" },
      { label: "Category", value: (row) => row.category?.name || "" },
      { label: "Brand", value: "brand" },
      { label: "Model Number", value: "modelNumber" },
      { label: "Quantity", value: "quantity" },
      { label: "Selling Rate", value: "sellingRate" },
      { label: "Cost Rate", value: "costRate" },
      { label: "Status", value: "status" },
      { label: "Warranty", value: "warranty" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(products);

    res.header("Content-Type", "text/csv");
    res.attachment("products.csv");
    res.send(csv);
  } catch (error) {
    console.error("Error exporting products:", error.message);
    res.status(500).json({ error: "Server error while exporting products" });
  }
};

// ✅ Scrape Product Data from URL
exports.scrapeProductData = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const htmlContent = await new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Timeout')));
      req.end();
    });

    const productData = {};
    const hostname = urlObj.hostname.toLowerCase();

    // Extract title
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      let name = titleMatch[1].replace(/&[^;]+;/g, '').trim();
      // Clean Amazon title
      if (hostname.includes('amazon')) {
        name = name.replace(/^Amazon\.in:\s*Buy\s*/i, '');
        name = name.replace(/\s*Online at Low Prices.*$/i, '');
        name = name.replace(/\s*Reviews.*$/i, '');
      }
      productData.name = name;
    }

    // Extract price (basic patterns)
    const pricePatterns = [
      /₹[\s]*([\d,]+)/g,
      /Rs[\s.]*([\d,]+)/g,
      /price[^>]*>.*?([\d,]+)/gi
    ];
    
    for (const pattern of pricePatterns) {
      const match = htmlContent.match(pattern);
      if (match) {
        const price = match[0].replace(/[^\d]/g, '');
        if (price && price.length > 2) {
          const numPrice = parseInt(price);
          if (numPrice > 100) {
            productData.sellingRate = numPrice;
            break;
          }
        }
      }
    }

    // Extract basic attributes from common patterns
    const attributes = {};
    const specPatterns = [
      /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<\/tr>/gi,
      /<dt[^>]*>([^<]+)<\/dt>.*?<dd[^>]*>([^<]+)<\/dd>/gi
    ];

    specPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(htmlContent)) !== null) {
        const key = match[1].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
        const value = match[2].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
        if (key && value && key.length < 30 && value.length < 50) {
          const cleanKey = key.replace(/[^\w\s]/g, '').trim();
          const cleanValue = value.replace(/[^\w\s.-]/g, '').trim();
          if (cleanKey && cleanValue) {
            attributes[cleanKey] = cleanValue;
          }
        }
      }
    });

    if (Object.keys(attributes).length > 0) {
      productData.attributes = attributes;
    }

    // Extract brand from title or content
    const brandPatterns = ['MSI', 'ASUS', 'Gigabyte', 'ASRock', 'Intel', 'AMD', 'NVIDIA', 'Corsair', 'Samsung', 'Apple'];
    for (const brand of brandPatterns) {
      if (productData.name && productData.name.toLowerCase().includes(brand.toLowerCase())) {
        productData.brand = brand;
        break;
      }
    }
    
    // Extract model number
    if (productData.name) {
      const modelMatch = productData.name.match(/\b([A-Z][0-9]{3,}[A-Z]*|[A-Z]{2,}[0-9]{2,}[A-Z]*)\b/);
      if (modelMatch) {
        productData.modelNumber = modelMatch[1];
      }
    }

    res.json({
      success: true,
      data: productData,
      message: 'Product data extracted successfully'
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape product data',
      message: error.message 
    });
  }
};
