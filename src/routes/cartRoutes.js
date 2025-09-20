const express = require("express");
const {
  createCart,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require("../controllers/cartController");

const router = express.Router();

router.post("/", createCart);
router.get("/:sessionId", getCart);
router.post("/:sessionId/items", addToCart);
router.put("/:sessionId/items/:productId", updateCartItem);
router.delete("/:sessionId/items/:productId", removeFromCart);
router.delete("/:sessionId", clearCart);

module.exports = router;