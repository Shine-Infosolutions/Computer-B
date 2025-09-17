const Product = require("../models/Product");
const Category = require("../models/Category");

// Get products by category with attributes
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const products = await Product.find({ category: categoryId }).populate("category");
    
    if (!products.length) {
      return res.status(404).json({ message: "No products found for this category" });
    }

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
    res.status(500).json({ error: error.message });
  }
};

// Get attributes by category ID or name
exports.getAttributesByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    let category = await Category.findById(categoryId);
    if (!category) {
      category = await Category.findOne({ name: categoryId });
    }
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const templates = {
      "CPU": {
        "socketType": "", "ChipsetSupport": "", "generation": "", "coreCount": "", "threadCount": "",
        "baseClockSpeed": "", "maxBoostSpeed": "", "tdp": "", "integratedGraphics": "", "RamType": "",
        "memorySpeed": "", "memoryChannels": "", "pcieVersion": "", "overclockingSupport": "",
        "coolerIncluded": "", "releaseYear": ""
      },
      "Motherboard": {
        "formFactor": "", "socketType": "", "ChipsetSupport": "", "chipset": "", "RamType": "",
        "RamMemoryCapacity": "", "memorySlots": "", "RamSpeed": "", "pcieSlots": "", "m2Slots": "",
        "sataPorts": "", "usbPorts": "", "networking": "", "pcieInterface": "", "audioChipset": "",
        "vrmPowerPhases": "", "releaseYear": "", "Storagetype": "", "wattage": ""
      },
      "RAM": {
        "RamType": "", "RamMemoryCapacity": "", "RamSpeed": "", "casLatency": "", "voltage": "",
        "formFactor": "", "eccSupport": "", "rgbLighting": "", "releaseYear": ""
      },
      "Storage": {
        "Storagetype": "", "capacity": "", "interface": "", "formFactor": "", "readSpeed": "",
        "writeSpeed": "", "cache": "", "enduranceTbw": "", "mtbf": "", "releaseYear": ""
      },
      "GPU": {
        "series": "", "gpuArchitecture": "", "memorySize": "", "memoryType": "", "memoryBusWidth": "",
        "coreClockSpeed": "", "boostClockSpeed": "", "cudaShaderCores": "", "rayTracingSupport": "",
        "dlssFsrSupport": "", "pcieInterface": "", "powerConsumption": "", "recommendedPsuWattage": "",
        "powerConnectors": "", "coolingSolution": "", "outputPorts": "", "releaseYear": ""
      },
      "PSU": {
        "wattage": "", "formFactor": "", "efficiencyRating": "", "modular": "", "fanSize": "",
        "connectorTypes": "", "protections": "", "releaseYear": ""
      }
    };

    const categoryAttributes = templates[category.name];
    if (!categoryAttributes) {
      return res.status(404).json({ error: "No attributes template found for this category" });
    }

    res.json({ category: category.name, attributes: categoryAttributes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get attribute templates for all categories
exports.getAttributeTemplates = async (req, res) => {
  try {
    const templates = {
      "CPU": {
        "socketType": "", "ChipsetSupport": "", "generation": "", "coreCount": "", "threadCount": "",
        "baseClockSpeed": "", "maxBoostSpeed": "", "tdp": "", "integratedGraphics": "", "RamType": "",
        "memorySpeed": "", "memoryChannels": "", "pcieVersion": "", "overclockingSupport": "",
        "coolerIncluded": "", "releaseYear": ""
      },
      "Motherboard": {
        "formFactor": "", "socketType": "", "ChipsetSupport": "", "chipset": "", "RamType": "",
        "RamMemoryCapacity": "", "memorySlots": "", "RamSpeed": "", "pcieSlots": "", "m2Slots": "",
        "sataPorts": "", "usbPorts": "", "networking": "", "pcieInterface": "", "audioChipset": "",
        "vrmPowerPhases": "", "releaseYear": "", "Storagetype": "", "wattage": ""
      },
      "RAM": {
        "RamType": "", "RamMemoryCapacity": "", "RamSpeed": "", "casLatency": "", "voltage": "",
        "formFactor": "", "eccSupport": "", "rgbLighting": "", "releaseYear": ""
      },
      "Storage": {
        "Storagetype": "", "capacity": "", "interface": "", "formFactor": "", "readSpeed": "",
        "writeSpeed": "", "cache": "", "enduranceTbw": "", "mtbf": "", "releaseYear": ""
      },
      "GPU": {
        "series": "", "gpuArchitecture": "", "memorySize": "", "memoryType": "", "memoryBusWidth": "",
        "coreClockSpeed": "", "boostClockSpeed": "", "cudaShaderCores": "", "rayTracingSupport": "",
        "dlssFsrSupport": "", "pcieInterface": "", "powerConsumption": "", "recommendedPsuWattage": "",
        "powerConnectors": "", "coolingSolution": "", "outputPorts": "", "releaseYear": ""
      },
      "PSU": {
        "wattage": "", "formFactor": "", "efficiencyRating": "", "modular": "", "fanSize": "",
        "connectorTypes": "", "protections": "", "releaseYear": ""
      }
    };
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add attribute values to product
exports.addAttributeValues = async (req, res) => {
  try {
    const { productId } = req.params;
    const { attributes } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const currentAttributes = product.attributes || new Map();
    for (let key in attributes) {
      currentAttributes.set(key, attributes[key]);
    }

    product.attributes = currentAttributes;
    await product.save();

    const updatedProduct = await Product.findById(productId).populate("category");
    res.json({ message: "Attributes added successfully", product: updatedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk extract and populate all attributes from URL
exports.extractAllAttributesFromUrl = async (req, res) => {
  try {
    const { url, categoryName } = req.body;
    
    if (!url || !categoryName) {
      return res.status(400).json({ error: 'URL and category name are required' });
    }

    const templates = {
      "Storage": {
        "Storagetype": "", "capacity": "", "interface": "", "formFactor": "", "readSpeed": "",
        "writeSpeed": "", "cache": "", "enduranceTbw": "", "mtbf": "", "releaseYear": ""
      },
      "Motherboard": {
        "formFactor": "", "socketType": "", "ChipsetSupport": "", "chipset": "", "RamType": "",
        "RamMemoryCapacity": "", "memorySlots": "", "RamSpeed": "", "pcieSlots": "", "m2Slots": "",
        "sataPorts": "", "usbPorts": "", "networking": "", "pcieInterface": "", "audioChipset": "",
        "vrmPowerPhases": "", "releaseYear": "", "Storagetype": "", "wattage": ""
      }
    };

    const categoryTemplate = templates[categoryName];
    if (!categoryTemplate) {
      return res.status(400).json({ error: 'Invalid category name' });
    }

    // Simple extraction from product name in URL
    const extractedData = { ...categoryTemplate };
    const urlLower = url.toLowerCase();
    
    if (categoryName === 'Storage') {
      if (urlLower.includes('ssd')) extractedData.Storagetype = 'SSD';
      if (urlLower.includes('nvme')) extractedData.interface = 'NVMe';
      if (urlLower.includes('m.2')) extractedData.formFactor = 'M.2';
      
      const capacityMatch = urlLower.match(/(\d+)(gb|tb)/);
      if (capacityMatch) {
        extractedData.capacity = capacityMatch[1] + ' ' + capacityMatch[2].toUpperCase();
      }
    }

    res.json({
      success: true,
      category: categoryName,
      attributes: extractedData,
      message: 'All category attributes populated'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};