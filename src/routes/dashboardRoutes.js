const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

router.get("/categories/count", dashboardController.getTotalCategories);
router.get("/orders/yearly", dashboardController.getYearlyOrders);
router.get("/sales/yearly", dashboardController.getYearlySales);
router.get("/products/category-wise", dashboardController.getCategoryWiseProducts);

module.exports = router;