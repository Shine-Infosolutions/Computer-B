const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Auto-detect compatible products based on attributes
router.get('/auto/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).populate('category');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const allProducts = await Product.find({ _id: { $ne: product._id } }).populate('category');
    
    const getAttr = (p, keys) => {
      if (!p.attributes) return null;
      for (const key of keys) {
        const val = p.attributes.get ? p.attributes.get(key) : p.attributes[key];
        if (val) return val.toString().toLowerCase().trim();
      }
      return null;
    };

    const category = product.category.name.toLowerCase();
    const compatible = allProducts.filter(p => {
      const pCategory = p.category.name.toLowerCase();
      
      if (category === 'motherboard') {
        const mbSocket = getAttr(product, ['socketType', 'socket', 'Socket']);
        const mbRam = getAttr(product, ['ramType', 'memoryType', 'RamType']);
        const mbPcie = getAttr(product, ['pcieVersion', 'pcie', 'pcieInterface']);
        
        if (pCategory === 'cpu') {
          const cpuSocket = getAttr(p, ['socketType', 'socket', 'Socket']);
          return mbSocket && cpuSocket && mbSocket === cpuSocket;
        }
        if (pCategory === 'ram') {
          const ramType = getAttr(p, ['ramType', 'memoryType', 'RamType']);
          return mbRam && ramType && mbRam === ramType;
        }
        if (pCategory === 'gpu') {
          const gpuPcie = getAttr(p, ['pcieVersion', 'pcie', 'pcieInterface']);
          return mbPcie && gpuPcie && mbPcie === gpuPcie;
        }
      }
      
      if (category === 'cpu') {
        if (pCategory === 'motherboard') {
          const cpuSocket = getAttr(product, ['socketType', 'socket', 'Socket']);
          const mbSocket = getAttr(p, ['socketType', 'socket', 'Socket']);
          return cpuSocket && mbSocket && cpuSocket === mbSocket;
        }
      }
      
      if (category === 'ram') {
        if (pCategory === 'motherboard') {
          const ramType = getAttr(product, ['ramType', 'memoryType', 'RamType']);
          const mbRam = getAttr(p, ['ramType', 'memoryType', 'RamType']);
          return ramType && mbRam && ramType === mbRam;
        }
      }
      
      if (category === 'gpu') {
        if (pCategory === 'motherboard') {
          const gpuPcie = getAttr(product, ['pcieVersion', 'pcie', 'pcieInterface']);
          const mbPcie = getAttr(p, ['pcieVersion', 'pcie', 'pcieInterface']);
          return gpuPcie && mbPcie && gpuPcie === mbPcie;
        }
      }
      
      return false;
    }).map(p => ({
      _id: p._id,
      name: p.name,
      brand: p.brand,
      category: p.category.name,
      sellingRate: p.sellingRate,
      isCompatible: true
    }));

    res.json({ 
      success: true, 
      product: { _id: product._id, name: product.name, category: product.category.name },
      compatibleProducts: compatible,
      totalCompatible: compatible.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all products with auto-detected compatibility status
router.get('/auto/:productId/all', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).populate('category');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const allProducts = await Product.find({ _id: { $ne: product._id } }).populate('category');
    
    const getAttr = (p, keys) => {
      if (!p.attributes) return null;
      for (const key of keys) {
        const val = p.attributes.get ? p.attributes.get(key) : p.attributes[key];
        if (val) return val.toString().toLowerCase().trim();
      }
      return null;
    };

    const category = product.category.name.toLowerCase();
    
    const productsWithStatus = allProducts.map(p => {
      const pCategory = p.category.name.toLowerCase();
      let isCompatible = false;
      
      if (category === 'motherboard') {
        const mbSocket = getAttr(product, ['socketType', 'socket', 'Socket']);
        const mbRam = getAttr(product, ['ramType', 'memoryType', 'RamType']);
        const mbPcie = getAttr(product, ['pcieVersion', 'pcie', 'pcieInterface']);
        
        if (pCategory === 'cpu') {
          const cpuSocket = getAttr(p, ['socketType', 'socket', 'Socket']);
          isCompatible = mbSocket && cpuSocket && mbSocket === cpuSocket;
        } else if (pCategory === 'ram') {
          const ramType = getAttr(p, ['ramType', 'memoryType', 'RamType']);
          isCompatible = mbRam && ramType && mbRam === ramType;
        } else if (pCategory === 'gpu') {
          const gpuPcie = getAttr(p, ['pcieVersion', 'pcie', 'pcieInterface']);
          isCompatible = mbPcie && gpuPcie && mbPcie === gpuPcie;
        }
      } else if (category === 'cpu' && pCategory === 'motherboard') {
        const cpuSocket = getAttr(product, ['socketType', 'socket', 'Socket']);
        const mbSocket = getAttr(p, ['socketType', 'socket', 'Socket']);
        isCompatible = cpuSocket && mbSocket && cpuSocket === mbSocket;
      } else if (category === 'ram' && pCategory === 'motherboard') {
        const ramType = getAttr(product, ['ramType', 'memoryType', 'RamType']);
        const mbRam = getAttr(p, ['ramType', 'memoryType', 'RamType']);
        isCompatible = ramType && mbRam && ramType === mbRam;
      } else if (category === 'gpu' && pCategory === 'motherboard') {
        const gpuPcie = getAttr(product, ['pcieVersion', 'pcie', 'pcieInterface']);
        const mbPcie = getAttr(p, ['pcieVersion', 'pcie', 'pcieInterface']);
        isCompatible = gpuPcie && mbPcie && gpuPcie === mbPcie;
      }
      
      return {
        _id: p._id,
        name: p.name,
        brand: p.brand,
        category: p.category.name,
        sellingRate: p.sellingRate,
        isCompatible,
        color: isCompatible ? 'green' : 'white'
      };
    });

    res.json({ success: true, data: productsWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add compatibility between products
router.post('/add', async (req, res) => {
  try {
    const { productId, compatibleProductIds } = req.body;
    
    await Product.findByIdAndUpdate(productId, {
      $addToSet: { compatibleWith: { $each: compatibleProductIds } }
    });

    res.json({ success: true, message: 'Compatibility added' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove compatibility
router.post('/remove', async (req, res) => {
  try {
    const { productId, compatibleProductId } = req.body;
    
    await Product.findByIdAndUpdate(productId, {
      $pull: { compatibleWith: compatibleProductId }
    });

    res.json({ success: true, message: 'Compatibility removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check compatibility between two products
router.get('/check/:productId/:targetProductId', async (req, res) => {
  try {
    const { productId, targetProductId } = req.params;
    
    const product = await Product.findById(productId);
    const isCompatible = product?.compatibleWith?.includes(targetProductId);

    res.json({ success: true, isCompatible });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all compatible products for a product
router.get('/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('compatibleWith', 'name brand modelNumber sellingRate category')
      .populate('category', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ 
      success: true, 
      product: {
        _id: product._id,
        name: product.name,
        category: product.category
      },
      compatibleProducts: product.compatibleWith || [],
      totalCompatible: product.compatibleWith?.length || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all products with their compatibility status for a specific product
router.get('/:productId/all', async (req, res) => {
  try {
    const targetProduct = await Product.findById(req.params.productId);
    if (!targetProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const allProducts = await Product.find({ _id: { $ne: req.params.productId } })
      .populate('category', 'name')
      .select('name brand modelNumber category compatibleWith');

    const compatibleIds = targetProduct.compatibleWith?.map(id => id.toString()) || [];

    const productsWithStatus = allProducts.map(p => {
      const isCompatible = compatibleIds.includes(p._id.toString());
      return {
        _id: p._id,
        name: p.name,
        brand: p.brand,
        modelNumber: p.modelNumber,
        category: p.category,
        isCompatible,
        color: isCompatible ? 'green' : 'white'
      };
    });

    res.json({ success: true, data: productsWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
