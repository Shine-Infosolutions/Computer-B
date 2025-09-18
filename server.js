const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const categoryRoutes = require("./src/routes/categoryRoutes");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const customerRoutes = require("./src/routes/customerRoutes");
const quotationRoutes = require("./src/routes/quotationRoutes");
const attributeRoutes = require("./src/routes/attributeRoutes");
const productScraperRoutes = require("./src/routes/productScraperRoutes");
const imageRoutes = require("./src/routes/imageRoutes");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ✅ CORS Middleware (allow specific frontend domain)
app.use(cors({
  origin: [
    "https://computer-drab.vercel.app",
    "http://localhost:5173",
    "https://computer-b.vercel.app",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));


app.use(express.json());

// Routes
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/attributes", attributeRoutes);
app.use("/api/scraper", productScraperRoutes);
app.use("/api/images", imageRoutes);


// Default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
