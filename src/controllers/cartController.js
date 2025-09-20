const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { sendError, sendSuccess, isValidObjectId } = require("../utils/helpers");

// Get or create global cart
const getOrCreateCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ cartId: 'global' }).populate('items.product');
    
    if (!cart) {
      cart = new Cart({ cartId: 'global', items: [], totalAmount: 0 });
      await cart.save();
    }
    
    sendSuccess(res, cart);
  } catch (error) {
    sendError(res, 500, "Failed to get cart", error);
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
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
    
    let cart = await Cart.findOne({ cartId: 'global' });
    
    if (!cart) {
      cart = new Cart({ cartId: 'global', items: [], totalAmount: 0 });
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
    
    await cart.save();
    await cart.populate('items.product');
    
    sendSuccess(res, cart, "Item added to cart");
  } catch (error) {
    sendError(res, 500, "Failed to add item to cart", error);
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!isValidObjectId(productId)) {
      return sendError(res, 400, "Invalid product ID");
    }
    
    const cart = await Cart.findOne({ cartId: 'global' });
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
    const { productId } = req.params;
    
    if (!isValidObjectId(productId)) {
      return sendError(res, 400, "Invalid product ID");
    }
    
    const cart = await Cart.findOne({ cartId: 'global' });
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
    const cart = await Cart.findOne({ cartId: 'global' });
    if (cart) {
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
    }
    
    sendSuccess(res, { items: [], totalAmount: 0 }, "Cart cleared");
  } catch (error) {
    sendError(res, 500, "Failed to clear cart", error);
  }
};

module.exports = {
  getOrCreateCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};