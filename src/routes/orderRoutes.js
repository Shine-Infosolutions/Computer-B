const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Create Order / Quotation
router.post("/create", orderController.createOrder); 

// Get all orders (with ?type=Order OR ?type=Quotation)
router.get("/get", orderController.getOrders);

// Get order by ID
router.get("/get/:id", orderController.getOrderById);

// Search quotations only
router.get("/quotations/search", orderController.searchQuotations);

// Debug: List all quotations
router.get("/quotations/all", orderController.getAllQuotations);

// Get quotation by quoteId
router.get("/quotation/:quoteId", orderController.getQuotationByQuoteId);

// Get order by orderId
router.get("/order/:orderId", orderController.getOrderByOrderId);

// Get customer items by quotation ID
router.get("/quotation/:quoteId/items", orderController.getItemsByQuotationId);

// Get quotations by status (pending/confirmed)
router.get("/quotations/status/:status", orderController.getQuotationsByStatus);

// Update quotation status
router.put("/quotations/:id/status", orderController.updateQuotationStatus);

router.get("/export/csv", orderController.exportOrdersCSV);
router.get("/quotations/export/csv", orderController.exportQuotationsCSV);

// Update order
router.put("/update/:id", orderController.updateOrder);

// Delete order
router.delete("/delete/:id", orderController.deleteOrder);

// Get deleted quotations
router.get("/quotations/deleted", orderController.getDeletedQuotations);

// Restore deleted quotation
router.put("/quotations/:id/restore", orderController.restoreQuotation);

module.exports = router;
