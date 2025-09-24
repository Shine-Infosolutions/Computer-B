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
        "Processor": "", "Cores": "", "Threads": "", "Base Clock Speed": "", "Boost Clock Speed": "",
        "L3 Cache": "", "Socket": "", "Chipset": "", "TDP": "", "Integrated Graphics": "",
        "PCIe Support": "", "Supported RAM Types": "", "Thermal Solution": ""
      },
      "Motherboard": {
        "Chipset": "", "CPU Socket": "", "Memory Slots": "", "Maximum RAM": "", "Supported RAM Types": "",
        "Expansion Slots": "", "Integrated Graphics": "", "Audio Codec": "", "LAN": "", "M.2 Slots": "",
        "Form Factor": "", "Dimensions": "", "BIOS": "", "SATA Ports": "", "USB Ports": ""
      },
      "RAM": {
        "Capacity": "", "Supported RAM Types": "", "Speed": "", "CAS Latency": "", "Modules": "",
        "Voltage": "", "ECC": "", "Rank": "", "Form Factor": "", "Interface": "", "Data Rate": ""
      },
      "Storage": {
        "Storagetype": "", "capacity": "", "interface": "", "formFactor": "", "readSpeed": "",
        "writeSpeed": "", "cache": "", "enduranceTbw": "", "mtbf": "", "releaseYear": ""
      },
      "GPU": {
        "GPU Processor": "", "CUDA Cores": "", "Boost Clock": "", "Memory": "", "Memory Bus": "",
        "Memory Bandwidth": "", "Stream Processors": "", "TDP": "", "Interface": "", "Dimensions": "",
        "Power Connectors": "", "Cooling": "", "API Support": ""
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
        "Processor": "", "Cores": "", "Threads": "", "Base Clock Speed": "", "Boost Clock Speed": "",
        "L3 Cache": "", "Socket": "", "Chipset": "", "TDP": "", "Integrated Graphics": "",
        "PCIe Support": "", "Supported RAM Types": "", "Thermal Solution": ""
      },
      "Motherboard": {
        "Chipset": "", "CPU Socket": "", "Memory Slots": "", "Maximum RAM": "", "Supported RAM Types": "",
        "Expansion Slots": "", "Integrated Graphics": "", "Audio Codec": "", "LAN": "", "M.2 Slots": "",
        "Form Factor": "", "Dimensions": "", "BIOS": "", "SATA Ports": "", "USB Ports": ""
      },
      "RAM": {
        "Capacity": "", "Supported RAM Types": "", "Speed": "", "CAS Latency": "", "Modules": "",
        "Voltage": "", "ECC": "", "Rank": "", "Form Factor": "", "Interface": "", "Data Rate": ""
      },
      "Storage": {
        "Storagetype": "", "capacity": "", "interface": "", "formFactor": "", "readSpeed": "",
        "writeSpeed": "", "cache": "", "enduranceTbw": "", "mtbf": "", "releaseYear": ""
      },
      "GPU": {
        "GPU Processor": "", "CUDA Cores": "", "Boost Clock": "", "Memory": "", "Memory Bus": "",
        "Memory Bandwidth": "", "Stream Processors": "", "TDP": "", "Interface": "", "Dimensions": "",
        "Power Connectors": "", "Cooling": "", "API Support": ""
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



