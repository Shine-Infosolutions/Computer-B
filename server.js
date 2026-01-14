const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Security middleware
app.use(cors({
  origin: [
    "https://mittal-computers.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "https://computer-b.vercel.app",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
const routes = [
  ['/api/categories', require('./src/routes/categoryRoutes')],
  ['/api/subcategories', require('./src/routes/subCategoryRoutes')],
  ['/api/products', require('./src/routes/productRoutes')],
  ['/api/orders', require('./src/routes/orderRoutes')],
  ['/api/dashboard', require('./src/routes/dashboardRoutes')],
  ['/api/customers', require('./src/routes/customerRoutes')],
  ['/api/quotations', require('./src/routes/quotationRoutes')],
  ['/api/attributes', require('./src/routes/attributeRoutes')],
  ['/api/scraper', require('./src/routes/productScraperRoutes')],
  ['/api/cart', require('./src/routes/cartRoutes')],
  ['/api/bulk-import', require('./src/routes/bulkImportRoutes')],
  ['/api/compatibility', require('./src/routes/compatibilityRoutes')]
];

routes.forEach(([path, router]) => app.use(path, router));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Computer Shop API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
