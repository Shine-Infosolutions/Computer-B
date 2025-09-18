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
        "RamType": "", "RamMemoryCapacity": "", "RamSpeed": "", "casLatency": "", "Voltage": "",
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
        "RamType": "", "RamMemoryCapacity": "", "RamSpeed": "", "casLatency": "", "Voltage": "",
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

// Extract attributes from uploaded image using OCR
exports.extractAttributesFromImage = async (req, res) => {
  const fs = require('fs');
  const vision = require('@google-cloud/vision');
  
  try {
    const { categoryName } = req.body;
    const uploadedFile = req.file;
    
    if (!categoryName || !uploadedFile) {
      return res.status(400).json({ error: 'Category name and image file are required' });
    }

    const templates = {
      "Storage": { "Storagetype": "", "capacity": "", "interface": "", "formFactor": "", "readSpeed": "", "writeSpeed": "", "cache": "", "enduranceTbw": "", "mtbf": "", "releaseYear": "" },
      "Motherboard": { "formFactor": "", "socketType": "", "ChipsetSupport": "", "chipset": "", "RamType": "", "RamMemoryCapacity": "", "memorySlots": "", "RamSpeed": "", "pcieSlots": "", "m2Slots": "", "sataPorts": "", "usbPorts": "", "networking": "", "pcieInterface": "", "audioChipset": "", "vrmPowerPhases": "", "releaseYear": "", "Storagetype": "", "wattage": "" },
      "CPU": { "socketType": "", "ChipsetSupport": "", "generation": "", "coreCount": "", "threadCount": "", "baseClockSpeed": "", "maxBoostSpeed": "", "tdp": "", "integratedGraphics": "", "RamType": "", "memorySpeed": "", "memoryChannels": "", "pcieVersion": "", "overclockingSupport": "", "coolerIncluded": "", "releaseYear": "" },
      "RAM": { "RamType": "", "RamMemoryCapacity": "", "RamSpeed": "", "casLatency": "", "Voltage": "", "formFactor": "", "eccSupport": "", "rgbLighting": "", "releaseYear": "" },
      "GPU": { "series": "", "gpuArchitecture": "", "memorySize": "", "memoryType": "", "memoryBusWidth": "", "coreClockSpeed": "", "boostClockSpeed": "", "cudaShaderCores": "", "rayTracingSupport": "", "dlssFsrSupport": "", "pcieInterface": "", "powerConsumption": "", "recommendedPsuWattage": "", "powerConnectors": "", "coolingSolution": "", "outputPorts": "", "releaseYear": "" }
    };

    const categoryTemplate = templates[categoryName];
    if (!categoryTemplate) {
      return res.status(400).json({ error: 'Invalid category name' });
    }

    // Google Vision API OCR
    const client = new vision.ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    const [result] = await client.textDetection(uploadedFile.path);
    const detections = result.textAnnotations;
    const text = detections.length > 0 ? detections[0].description : '';
    
    const extractedData = { ...categoryTemplate };
    const textLower = text.toLowerCase();

    // Parse attributes based on OCR text
    if (categoryName === 'Motherboard') {
      if (textLower.includes('am5')) extractedData.socketType = 'AM5';
      if (textLower.includes('am4')) extractedData.socketType = 'AM4';
      if (textLower.includes('ddr5')) extractedData.RamType = 'DDR5';
      if (textLower.includes('ddr4')) extractedData.RamType = 'DDR4';
      
      const memMatch = textLower.match(/(\d+)\s*gb/);
      if (memMatch) extractedData.RamMemoryCapacity = memMatch[1] + 'GB';
      
      const speedMatch = textLower.match(/(\d{4})\s*mhz/);
      if (speedMatch) extractedData.RamSpeed = speedMatch[1] + 'MHz';
    }

    if (categoryName === 'CPU') {
      const coreMatch = textLower.match(/(\d+)\s*core/);
      if (coreMatch) extractedData.coreCount = coreMatch[1];
      
      const ghzMatch = textLower.match(/(\d+\.\d+)\s*ghz/);
      if (ghzMatch) extractedData.baseClockSpeed = ghzMatch[1] + ' GHz';
    }

    if (categoryName === 'Storage') {
      if (textLower.includes('ssd')) extractedData.Storagetype = 'SSD';
      if (textLower.includes('nvme')) extractedData.interface = 'NVMe';
      
      const capacityMatch = textLower.match(/(\d+)\s*(gb|tb)/);
      if (capacityMatch) extractedData.capacity = capacityMatch[1] + ' ' + capacityMatch[2].toUpperCase();
    }

    // Delete uploaded file after processing
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      fs.unlinkSync(uploadedFile.path);
    }

    res.json({
      success: true,
      category: categoryName,
      attributes: extractedData,
      extractedText: text,
      message: 'Attributes extracted using Google Vision API'
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};

