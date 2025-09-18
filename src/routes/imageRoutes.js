const express = require('express');
const { upload, processImage } = require('../controllers/imageController');

const router = express.Router();

router.post('/upload', upload.single('image'), processImage);

module.exports = router;