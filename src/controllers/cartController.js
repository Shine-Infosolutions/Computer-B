const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { sendError, sendSuccess, isValidObjectId } = require("../utils/helpers");
const crypto = require("crypto");

// Create new cart session
const createCart = async (req, res) => {
  try {
    const sessionId = crypto.randomUUID();
    const cart = new Cart({ sessionId, items: [] });
    await cart.save();
    
    sendSuccess(res, { sessionId, items: [], totalAmount: 0 }, "Cart session created");
  } catch (error) {
    sendError(res, 500, "Failed to create cart", error);
  }
};

// Get cart by session ID
const getCart = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const cart = await Cart.findOne({ sessionId }).populate('items.product');
    
    if (!cart) {
      return sendError(res, 404, "Cart not found");
    }
    
    sendSuccess(res, cart);
  } catch (error) {
    sendError(res, 500, "Failed to fetch cart", error);
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return sendError(res, 400, "Product ID is required");
    }
    
    if (!isValidObjectId(productId)) {
      return sendError(res, 400, "Invalid product ID");
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, "Product not found");
    }
    
    let cart = await Cart.findOne({ sessionId });
    
    if (!cart) {
      cart = new Cart({ 
        sessionId, 
        items: [],
        totalAmount: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }
    
    const existingItem = cart.items.find(item => item.product.toString() === productId);
    
    if (existingItem) {
      existingItem.quantity += Number(quantity);
    } else {
      cart.items.push({
        product: productId,
        quantity: Number(quantity),
        price: Number(product.sellingRate)
      });
    }
    
    cart.totalAmount = cart.items.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await cart.save();
    await cart.populate('items.product');
    
    sendSuccess(res, cart, "Item added to cart");
  } catch (error) {
    console.error('Add to cart error:', error);
    sendError(res, 500, "Failed to add item to cart", error);
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { sessionId, productId } = req.params;
    const { quantity } = req.body;
    
    if (!isValidObjectId(productId)) {
      return sendError(res, 400, "Invalid product ID");
    }
    
    if (quantity < 1) {
      return sendError(res, 400, "Quantity must be at least 1");
    }
    
    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return sendError(res, 404, "Cart not found");
    }
    
    const item = cart.items.find(item => item.product.toString() === productId);
    if (!item) {
      return sendError(res, 404, "Item not found in cart");
    }
    
    item.quantity = quantity;
    cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    await cart.save();
    await cart.populate('items.product');
    
    sendSuccess(res, cart, "Cart updated");
  } catch (error) {
    sendError(res, 500, "Failed to update cart", error);
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { sessionId, productId } = req.params;
    
    if (!isValidObjectId(productId)) {
      return sendError(res, 400, "Invalid product ID");
    }
    
    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return sendError(res, 404, "Cart not found");
    }
    
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    await cart.save();
    await cart.populate('items.product');
    
    sendSuccess(res, cart, "Item removed from cart");
  } catch (error) {
    sendError(res, 500, "Failed to remove item from cart", error);
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await Cart.findOneAndDelete({ sessionId });
    
    sendSuccess(res, { items: [], totalAmount: 0 }, "Cart cleared");
  } catch (error) {
    sendError(res, 500, "Failed to clear cart", error);
  }
};

module.exports = {
  createCart,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};