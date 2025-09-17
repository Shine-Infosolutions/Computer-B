const express = require('express');
const { scrapeProductData } = require('../controllers/productScraperController');

const router = express.Router();

router.post('/scrape', scrapeProductData);

module.exports = router;