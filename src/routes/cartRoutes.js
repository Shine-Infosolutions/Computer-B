const express = require("express");
const {
  getOrCreateCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require("../controllers/cartController");

const router = express.Router();

router.get("/", getOrCreateCart);
router.post("/items", addToCart);
router.put("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeFromCart);
router.delete("/", clearCart);

module.exports = router;