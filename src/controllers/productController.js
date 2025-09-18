const { Parser } = require("json2csv");
const Product = require("../models/Product");
const Category = require("../models/Category");
const https = require('https');
const http = require('http');

// ✅ Create Product
exports.createProduct = async (req, res) => {
  try {
    const { name, category, brand, modelNumber, quantity, sellingRate, costRate, status, warranty, attributes } = req.body;

    if (!name || !category || !sellingRate) {
      return res.status(400).json({ error: "Name, Category, and Selling Rate are required." });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) return res.status(400).json({ error: "Invalid category ID." });

    const formattedAttributes = new Map();
    if (attributes && typeof attributes === "object") {
      for (let key in attributes) formattedAttributes.set(key, attributes[key]);
    }

    const product = new Product({ name, category, brand, modelNumber, quantity, sellingRate, costRate, status, warranty, attributes: formattedAttributes });
    await product.save();

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Server error while creating product" });
  }
};

// ✅ Get compatible products
exports.getCompatibleProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.attributes || product.attributes.size === 0) {
      return res.json({ product, compatibleProducts: [], message: "No attributes to match" });
    }

    const allProducts = await Product.find({ _id: { $ne: product._id } }).populate("category");
    
    const compatibleProducts = allProducts.filter(p => {
      if (!p.attributes || p.attributes.size === 0) return false;
      
      // Check if any attribute matches
      for (const [key, value] of product.attributes) {
        if (p.attributes.has(key) && p.attributes.get(key)?.toString().toLowerCase() === value?.toString().toLowerCase()) {
          return true;
        }
      }
      return false;
    }).map(p => ({
      ...p.toObject(),
      matchingAttributes: Array.from(product.attributes.entries()).filter(([key, value]) => 
        p.attributes.has(key) && p.attributes.get(key)?.toString().toLowerCase() === value?.toString().toLowerCase()
      ).map(([key, value]) => ({ [key]: value }))
    }));

    res.json({ product, compatibleProducts });
  } catch (err) {
    console.error('Compatibility check error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Search Products
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      const products = await Product.find().populate("category");
      return res.json({ success: true, data: products });
    }

    const categories = await Category.find({ name: { $regex: q, $options: "i" } });
    const categoryIds = categories.map(cat => cat._id);
    
    const searchNum = parseFloat(q);
    const filter = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { category: { $in: categoryIds } },
        ...(searchNum ? [{ sellingRate: searchNum }] : [])
      ]
    };

    const products = await Product.find(filter).populate("category");
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// ✅ Get All Products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ error: "Server error while fetching products" });
  }
};

// ✅ Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({ error: "Server error while fetching product" });
  }
};

// ✅ Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { attributes, ...rest } = req.body;

    let formattedAttributes = undefined;
    if (attributes && typeof attributes === "object") {
      formattedAttributes = new Map();
      for (let key in attributes) formattedAttributes.set(key, attributes[key]);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...rest, ...(formattedAttributes ? { attributes: formattedAttributes } : {}) },
      { new: true }
    );

    if (!updatedProduct) return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product updated successfully", updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error.message);
    res.status(500).json({ error: "Server error while updating product" });
  }
};

// ✅ Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error.message);
    res.status(500).json({ error: "Server error while deleting product" });
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
