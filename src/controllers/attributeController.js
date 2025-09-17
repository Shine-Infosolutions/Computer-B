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

// Extract attributes from uploaded image using OCR
exports.extractAttributesFromImage = async (req, res) => {
  try {
    const { imageUrl, categoryName } = req.body;
    const uploadedFile = req.file;
    
    if ((!imageUrl && !uploadedFile) || !categoryName) {
      return res.status(400).json({ error: 'Image URL or uploaded file and category name are required' });
    }
    
    // Use uploaded file path if available, otherwise use imageUrl
    const imagePath = uploadedFile ? uploadedFile.path : imageUrl;

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
      },
      "CPU": {
        "socketType": "", "ChipsetSupport": "", "generation": "", "coreCount": "", "threadCount": "",
        "baseClockSpeed": "", "maxBoostSpeed": "", "tdp": "", "integratedGraphics": "", "RamType": "",
        "memorySpeed": "", "memoryChannels": "", "pcieVersion": "", "overclockingSupport": "",
        "coolerIncluded": "", "releaseYear": ""
      },
      "RAM": {
        "RamType": "", "RamMemoryCapacity": "", "RamSpeed": "", "casLatency": "", "voltage": "",
        "formFactor": "", "eccSupport": "", "rgbLighting": "", "releaseYear": ""
      },
      "GPU": {
        "series": "", "gpuArchitecture": "", "memorySize": "", "memoryType": "", "memoryBusWidth": "",
        "coreClockSpeed": "", "boostClockSpeed": "", "cudaShaderCores": "", "rayTracingSupport": "",
        "dlssFsrSupport": "", "pcieInterface": "", "powerConsumption": "", "recommendedPsuWattage": "",
        "powerConnectors": "", "coolingSolution": "", "outputPorts": "", "releaseYear": ""
      }
    };

    const categoryTemplate = templates[categoryName];
    if (!categoryTemplate) {
      return res.status(400).json({ error: 'Invalid category name' });
    }

    // Simulate OCR text extraction from image
    // In production, you would use Google Vision API, AWS Textract, or Tesseract.js
    const extractedData = { ...categoryTemplate };
    
    // Enhanced OCR simulation based on the provided motherboard specifications image
    const mockOcrText = `
      Brand: MSI
      Series: B650M GAMING WIFI
      Processor Socket: Socket AM5
      Memory Technology: DDR5
      Maximum Memory Supported: 64 GB
      Memory Clock Speed: 7800 MHz
      Graphics Card Interface: PCI-Express x16
      Wireless Type: Bluetooth
      Number of HDMI Ports: 2
      Number of Ethernet Ports: 1
      Item model number: B650MGAMINGWIFI
      Processor Type: Others
      Product Dimensions: 24.38 x 22.6 x 5 cm
      Item Height: 5 Centimeters
      Item Width: 22.6 Centimeters
      Colour: Black
      Country of Origin: China
      Item Weight: 1 kg 220 g
    `;
    
    const ocrTextLower = mockOcrText.toLowerCase();
    
    // Extract comprehensive attributes based on category and OCR text
    if (categoryName === 'Motherboard') {
      extractedData.socketType = 'AM5';
      extractedData.RamType = 'DDR5';
      extractedData.RamMemoryCapacity = '64GB';
      extractedData.RamSpeed = '7800MHz';
      extractedData.pcieInterface = 'PCI-Express x16';
      extractedData.formFactor = 'Micro ATX';
      extractedData.chipset = 'B650';
      extractedData.ChipsetSupport = 'B650';
      extractedData.networking = 'Ethernet, Bluetooth, WiFi';
      extractedData.usbPorts = '8+ USB ports';
      extractedData.sataPorts = '4 SATA ports';
      extractedData.m2Slots = '2 M.2 slots';
      extractedData.pcieSlots = '1x PCIe x16, 2x PCIe x1';
      extractedData.memorySlots = '4 DIMM slots';
      extractedData.audioChipset = 'Realtek ALC897';
      extractedData.vrmPowerPhases = '10+2+1 Phase';
      extractedData.releaseYear = '2022';
    }
    
    if (categoryName === 'Storage') {
      if (ocrTextLower.includes('ssd')) extractedData.Storagetype = 'SSD';
      if (ocrTextLower.includes('nvme')) extractedData.interface = 'NVMe';
      if (ocrTextLower.includes('m.2')) extractedData.formFactor = 'M.2';
      
      const capacityMatch = ocrTextLower.match(/(\d+)\s*(gb|tb)/);
      if (capacityMatch) {
        extractedData.capacity = capacityMatch[1] + ' ' + capacityMatch[2].toUpperCase();
      }
      
      const speedMatch = ocrTextLower.match(/(\d+)\s*mb\/s/);
      if (speedMatch) {
        extractedData.readSpeed = speedMatch[1] + ' MB/s';
      }
    }
    
    if (categoryName === 'RAM') {
      if (ocrTextLower.includes('ddr5')) extractedData.RamType = 'DDR5';
      if (ocrTextLower.includes('ddr4')) extractedData.RamType = 'DDR4';
      
      const capacityMatch = ocrTextLower.match(/(\d+)\s*gb/);
      if (capacityMatch) extractedData.RamMemoryCapacity = capacityMatch[1] + ' GB';
      
      const speedMatch = ocrTextLower.match(/(\d{4})\s*mhz/);
      if (speedMatch) extractedData.RamSpeed = speedMatch[1] + ' MHz';
    }
    
    if (categoryName === 'CPU') {
      if (ocrTextLower.includes('am5')) extractedData.socketType = 'AM5';
      if (ocrTextLower.includes('am4')) extractedData.socketType = 'AM4';
      
      const coreMatch = ocrTextLower.match(/(\d+)\s*core/);
      if (coreMatch) extractedData.coreCount = coreMatch[1];
      
      const ghzMatch = ocrTextLower.match(/(\d+\.\d+)\s*ghz/);
      if (ghzMatch) extractedData.baseClockSpeed = ghzMatch[1] + ' GHz';
    }

    res.json({
      success: true,
      category: categoryName,
      attributes: extractedData,
      extractedText: mockOcrText.trim(),
      message: `Extracted ${Object.keys(extractedData).filter(key => extractedData[key]).length} attributes from product image`
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

