const express = require("express");
const { getCustomers, getCustomerOrders } = require("../controllers/customerController");

const router = express.Router();

router.get("/", getCustomers);
router.get("/:customerId/orders", getCustomerOrders);

module.exports = router;