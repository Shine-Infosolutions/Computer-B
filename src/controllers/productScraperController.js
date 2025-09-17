const cheerio = require('cheerio');
const axios = require('axios');

const scrapeProductData = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Configure axios with headers to mimic a real browser
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const productData = {};
    
    // Try to extract JSON-LD structured data first
    let jsonLdData = null;
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const jsonText = $(elem).html();
        const parsed = JSON.parse(jsonText);
        if (parsed['@type'] === 'Product' || (Array.isArray(parsed) && parsed.some(item => item['@type'] === 'Product'))) {
          jsonLdData = Array.isArray(parsed) ? parsed.find(item => item['@type'] === 'Product') : parsed;
        }
      } catch (e) {}
    });
    
    // If JSON-LD data found, use it
    if (jsonLdData) {
      if (jsonLdData.name) productData.name = jsonLdData.name;
      if (jsonLdData.brand?.name) productData.brand = jsonLdData.brand.name;
      if (jsonLdData.model) productData.modelNumber = jsonLdData.model;
      if (jsonLdData.offers?.price) productData.sellingRate = parseFloat(jsonLdData.offers.price);
      
      // Extract attributes from JSON-LD
      const attributes = {};
      if (jsonLdData.additionalProperty) {
        jsonLdData.additionalProperty.forEach(prop => {
          if (prop.name && prop.value) {
            attributes[prop.name] = prop.value;
          }
        });
      }
      if (Object.keys(attributes).length > 0) {
        productData.attributes = attributes;
      }
      
      res.json({
        success: true,
        data: productData,
        message: 'Product data extracted from structured data'
      });
      return;
    }
    
    // Detect site type
    const hostname = new URL(url).hostname.toLowerCase();
    const isAmazon = hostname.includes('amazon');
    const isFlipkart = hostname.includes('flipkart');
    const isEbay = hostname.includes('ebay');

    // Site-specific and generic selectors
    let selectors = {
      name: [],
      price: [],
      brand: [],
      specifications: []
    };

    if (isAmazon) {
      selectors = {
        name: ['#productTitle', 'h1.a-size-large'],
        price: ['.a-price-whole', '.a-offscreen', '.a-price .a-offscreen'],
        brand: ['#bylineInfo', '.a-link-normal'],
        specifications: ['#productDetails_techSpec_section_1', '#productDetails_detailBullets_sections1']
      };
    } else if (isFlipkart) {
      selectors = {
        name: ['.B_NuCI', '._35KyD6'],
        price: ['._30jeq3', '._1_WHN1'],
        brand: ['._2b4S_j', '.G6XhBx'],
        specifications: ['._3k-BhJ', '._1UhVsV']
      };
    } else if (isEbay) {
      selectors = {
        name: ['h1#x-item-title-label', '.x-item-title-label'],
        price: ['.notranslate', '.u-flL.condense'],
        brand: ['.u-flL.condense span', '.vi-acc-del-range'],
        specifications: ['.u-flL.condense', '.itemAttr']
      };
    } else {
      // Generic selectors for other sites
      selectors = {
        name: ['h1', '.product-title', '.title', '[data-testid="product-title"]'],
        price: ['.price', '.product-price', '[data-testid="price"]', '.cost'],
        brand: ['.brand', '.manufacturer', '[data-testid="brand"]'],
        specifications: ['.specifications', '.tech-specs', '.product-details']
      };
    }

    // Extract product name
    for (const selector of selectors.name) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        productData.name = element.text().trim();
        break;
      }
    }

    // Extract price
    for (const selector of selectors.price) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        const priceText = element.text().trim().replace(/[^\d.,]/g, '');
        if (priceText) {
          productData.sellingRate = parseFloat(priceText.replace(',', ''));
          break;
        }
      }
    }

    // Extract brand
    for (const selector of selectors.brand) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        productData.brand = element.text().trim();
        break;
      }
    }

    // Extract specifications/attributes
    const attributes = {};
    
    if (isAmazon) {
      // Amazon Technical Details section
      $('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr').each((i, elem) => {
        const $elem = $(elem);
        const key = $elem.find('td:first-child').text().trim();
        const value = $elem.find('td:last-child').text().trim();
        if (key && value && key !== value && key.length > 2) {
          // Clean up common Amazon attribute names
          let cleanKey = key;
          if (key === 'Hard Drive Size') cleanKey = 'capacity';
          if (key === 'Hard Disk Description') cleanKey = 'Storagetype';
          if (key === 'Hard Drive Interface') cleanKey = 'interface';
          if (key === 'Form Factor') cleanKey = 'formFactor';
          if (key === 'Brand') cleanKey = 'brand';
          if (key === 'Series') cleanKey = 'series';
          if (key === 'Item model number') cleanKey = 'modelNumber';
          
          attributes[cleanKey] = value;
        }
      });
      
      // Try alternative selectors for product details
      $('table.a-keyvalue tr').each((i, elem) => {
        const $elem = $(elem);
        const key = $elem.find('td:first-child').text().trim();
        const value = $elem.find('td:last-child').text().trim();
        if (key && value && key !== value && key.length > 2) {
          attributes[key] = value;
        }
      });
    } else if (isFlipkart) {
      // Flipkart-specific attribute extraction
      $('._1UhVsV tr, ._3k-BhJ tr').each((i, elem) => {
        const $elem = $(elem);
        const key = $elem.find('td:first-child').text().trim();
        const value = $elem.find('td:last-child').text().trim();
        if (key && value && key !== value) {
          attributes[key] = value;
        }
      });
    } else {
      // Generic attribute extraction
      $('table tr, .specification-item, .spec-item').each((i, elem) => {
        const $elem = $(elem);
        const key = $elem.find('td:first-child, .spec-name, .attr-name').text().trim();
        const value = $elem.find('td:last-child, .spec-value, .attr-value').text().trim();
        
        if (key && value && key !== value) {
          attributes[key] = value;
        }
      });

      // Try to extract from description lists
      $('dl dt').each((i, elem) => {
        const $dt = $(elem);
        const $dd = $dt.next('dd');
        const key = $dt.text().trim();
        const value = $dd.text().trim();
        
        if (key && value) {
          attributes[key] = value;
        }
      });
    }

    // Extract from meta tags (works for all sites)
    $('meta[property^="product:"]').each((i, elem) => {
      const property = $(elem).attr('property');
      const content = $(elem).attr('content');
      if (property && content) {
        const key = property.replace('product:', '').replace(/[_-]/g, ' ');
        attributes[key] = content;
      }
    });

    // Clean and filter attributes with better mapping
    const cleanedAttributes = {};
    const attributeMap = {
      'processor socket': 'Socket Type',
      'socket': 'Socket Type', 
      'memory technology': 'RAM Type',
      'computer memory type': 'RAM Type',
      'form factor': 'Form Factor',
      'processor type': 'Processor',
      'maximum memory supported': 'Max RAM',
      'memory clock speed': 'RAM Speed',
      'graphics card interface': 'GPU Interface',
      'connectivity type': 'Connectivity',
      'wireless type': 'Wireless',
      'manufacturer': 'Brand',
      'series': 'Series'
    };
    
    Object.entries(attributes).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase().trim();
      const cleanValue = value.trim();
      
      // Map to standard attribute names
      const mappedKey = attributeMap[lowerKey] || key.trim();
      
      // Filter out junk data
      const isValidKey = mappedKey.length > 2 && !mappedKey.match(/^\d+$/);
      const isValidValue = cleanValue.length > 1 && !cleanValue.match(/^\d+$/) && cleanValue !== mappedKey;
      const notDimensions = !lowerKey.includes('cm') && !lowerKey.includes('kg');
      
      if (isValidKey && isValidValue && notDimensions) {
        cleanedAttributes[mappedKey] = cleanValue;
      }
    });
    


    // Extract model number from title or attributes
    if (productData.name) {
      const modelMatch = productData.name.match(/\b([A-Z0-9]{3,}[-_]?[A-Z0-9]{2,})\b/);
      if (modelMatch) {
        productData.modelNumber = modelMatch[1];
      }
    }

    // Clean and standardize attributes
    const cleanAttributes = {};
    
    if (attributes && Object.keys(attributes).length > 0) {
      Object.entries(attributes).forEach(([key, value]) => {
        const cleanKey = key.trim();
        const cleanValue = value.trim();
        
        // Only keep meaningful attributes
        if (cleanKey.length > 2 && cleanValue.length > 1 && cleanKey !== cleanValue) {
          cleanAttributes[cleanKey] = cleanValue;
        }
      });
    }
    
    // Extract additional specs from product name
    if (productData.name) {
      const name = productData.name.toLowerCase();
      
      if (name.includes('am5')) cleanAttributes['socketType'] = 'AM5';
      if (name.includes('am4')) cleanAttributes['socketType'] = 'AM4';
      if (name.includes('ddr5')) cleanAttributes['RamType'] = 'DDR5';
      if (name.includes('ddr4')) cleanAttributes['RamType'] = 'DDR4';
      if (name.includes('matx')) cleanAttributes['formFactor'] = 'Micro ATX';
      if (name.includes('nvme')) cleanAttributes['interface'] = 'NVMe';
      
      const capacityMatch = name.match(/(\d+)\s*(gb|tb)/i);
      if (capacityMatch) {
        cleanAttributes['capacity'] = capacityMatch[1] + ' ' + capacityMatch[2].toUpperCase();
      }
    }
    
    productData.attributes = cleanAttributes;

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

module.exports = {
  scrapeProductData
};