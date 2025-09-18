const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

exports.upload = multer({ storage });

// Process image and delete after extraction
exports.processImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Extract data from image
    const extractedData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    };
    
    // Delete image immediately after processing
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      data: extractedData,
      message: 'Image processed and removed'
    });
    
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};