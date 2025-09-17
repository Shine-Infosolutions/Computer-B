const { Parser } = require("json2csv");
const Order = require("../models/Order");
const Product = require("../models/Product");

// Generate sequential order ID starting from O-001
const generateOrderId = async () => {
  const lastOrder = await Order.findOne({ type: "Order" })
    .sort({ createdAt: -1 })
    .select("orderId");

  if (!lastOrder || !lastOrder.orderId) return "O-001";

  const lastNumber = parseInt(lastOrder.orderId.split("-")[1], 10);
  return `O-${String(lastNumber + 1).padStart(3, "0")}`;
};

// Generate sequential quotation ID starting from Q-001
const generateQuoteId = async () => {
  const lastQuote = await Order.findOne({ type: "Quotation" })
    .sort({ createdAt: -1 })
    .select("quoteId");

  if (!lastQuote || !lastQuote.quoteId) return "Q-001";

  const lastNumber = parseInt(lastQuote.quoteId.split("-")[1], 10);
  return `Q-${String(lastNumber + 1).padStart(3, "0")}`;
};

// Create Order/Quotation
exports.createOrder = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is required" });
    }
    
    const { customerName, customerEmail, customerPhone, address, items, type } = req.body;
    
    if (!customerName || !address || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "customerName, address, and items are required" });
    }

    // Generate orderId or quoteId based on type
    let generatedId;
    if (type === "Quotation") {
      const quoteCount = await Order.countDocuments({ type: "Quotation" });
      generatedId = `Q-${String(quoteCount + 1).padStart(3, '0')}`;
    } else {
      const orderCount = await Order.countDocuments({ type: { $ne: "Quotation" } });
      generatedId = `O-${String(orderCount + 1).padStart(3, '0')}`;
    }

    let totalAmount = 0;
    const populatedItems = [];

    for (let i of items) {
      const product = await Product.findById(i.product);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (type === "Order" && product.quantity < i.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      const price = i.price || product.sellingRate;
      const subtotal = price * i.quantity;
      totalAmount += subtotal;

      populatedItems.push({
        product: product._id,
        quantity: i.quantity,
        price,
      });

      if (type === "Order") {
        product.quantity -= i.quantity;
        await product.save();
      }
    }

    // Create order with generated ID
    const orderData = {
      customerName,
      customerEmail,
      customerPhone,
      address,
      items: populatedItems,
      totalAmount,
      type: type || "Order"
    };

    // Add the appropriate ID field
    if (type === "Quotation") {
      orderData.quoteId = generatedId;
    } else {
      orderData.orderId = generatedId;
    }

    const order = new Order(orderData);
    await order.save();

    res.status(201).json({ message: "Order created successfully", order });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all orders/quotations (with pagination + filter by type and status)
exports.getOrders = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 15, search } = req.query;
    let filter = { isDeleted: false };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    // Search by orderId, quoteId, or customer name
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { orderId: { $regex: q, $options: "i" } },
        { quoteId: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .populate("items.product")
      .skip(Number(skip))
      .limit(Number(limit))
      .sort({ createdAt: -1 }); // latest first

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get order/quotation by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search quotations with status filter
exports.searchQuotations = async (req, res) => {
  try {
    const { search, status } = req.query;
    let filter = { type: "Quotation", isDeleted: false };

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { quoteId: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } }
      ];
    }

    const quotations = await Order.find(filter)
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: quotations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get quotations by status (pending/confirmed)
exports.getQuotationsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 15 } = req.query;
    
    const filter = { 
      type: "Quotation",
      isDeleted: false,
      status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    };

    const skip = (page - 1) * limit;

    const quotations = await Order.find(filter)
      .populate("items.product")
      .skip(Number(skip))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: quotations.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      data: quotations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update quotation status
exports.updateQuotationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const quotation = await Order.findOneAndUpdate(
      { _id: id, type: "Quotation" },
      { status, updatedAt: Date.now() },
      { new: true }
    ).populate("items.product");

    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// List all quotations with status
exports.getAllQuotations = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = { type: "Quotation", isDeleted: false };
    
    if (status) {
      filter.status = status;
    }
    
    const quotations = await Order.find(filter).select("orderId quoteId customerName status createdAt");
    res.status(200).json({ success: true, data: quotations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get quotation by quoteId
exports.getQuotationByQuoteId = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const quotation = await Order.findOne({ quoteId, type: "Quotation", isDeleted: false }).populate("items.product");
    
    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get order by orderId
exports.getOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId, type: "Order" }).populate("items.product");
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get customer items by quotation ID
exports.getItemsByQuotationId = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const quotation = await Order.findOne({ quoteId, type: "Quotation", isDeleted: false }).populate("items.product");
    
    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    res.status(200).json({ 
      success: true, 
      data: {
        customer: {
          name: quotation.customerName,
          email: quotation.customerEmail,
          phone: quotation.customerPhone,
          address: quotation.address
        },
        items: quotation.items,
        totalAmount: quotation.totalAmount,
        quoteId: quotation.quoteId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update order/quotation
exports.updateOrder = async (req, res) => {
  try {
    const { items, type, ...rest } = req.body;
    let order = await Order.findById(req.params.id).populate("items.product");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Store original items for stock restoration
    const originalItems = [...order.items];

    // Restore stock for all original items (if it's an Order)
    if (type === "Order") {
      for (const originalItem of originalItems) {
        const product = await Product.findById(originalItem.product._id || originalItem.product);
        if (product) {
          product.quantity += originalItem.quantity;
          await product.save();
        }
      }
    }

    // Clear existing items and process new items
    order.items = [];
    let totalAmount = 0;

    // Merge duplicate products in incoming items by summing quantities
    const mergedItemsMap = new Map();
    for (const i of items) {
      const prodId = (i.product?._id || i.product).toString();
      if (mergedItemsMap.has(prodId)) {
        const prev = mergedItemsMap.get(prodId);
        mergedItemsMap.set(prodId, {
          ...prev,
          quantity: prev.quantity + i.quantity
        });
      } else {
        mergedItemsMap.set(prodId, { ...i });
      }
    }
    const uniqueItems = Array.from(mergedItemsMap.values());

    // Process each unique incoming item
    for (let i of uniqueItems) {
      const prodId = (i.product?._id || i.product).toString();
      const product = await Product.findById(prodId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check stock availability for Orders
      if (type === "Order") {
        if (product.quantity < i.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
        }
        // Deduct stock
        product.quantity -= i.quantity;
        await product.save();
      }

      // Add item to order
      const price = i.price || product.sellingRate;
      order.items.push({
        product: product._id,
        quantity: i.quantity,
        price: price,
      });

      totalAmount += i.quantity * price;
    }

    // Update other fields
    order.customerName = rest.customerName || order.customerName;
    order.customerEmail = rest.customerEmail || order.customerEmail;
    order.customerPhone = rest.customerPhone || order.customerPhone;
    order.address = rest.address || order.address;
    order.type = type || order.type;
    order.totalAmount = totalAmount;

    await order.save();
    order = await Order.findById(order._id).populate("items.product");

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Soft delete quotation (hard delete for orders)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.type === "Quotation") {
      // Soft delete for quotations
      if (order.isDeleted) {
        return res.status(400).json({ success: false, message: "Quotation already deleted" });
      }
      await Order.findByIdAndUpdate(req.params.id, {
        isDeleted: true,
        deletedAt: new Date()
      });
      res.status(200).json({ success: true, message: "Quotation deleted successfully" });
    } else {
      // Hard delete for orders
      await Order.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: "Order deleted successfully" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get deleted quotations
exports.getDeletedQuotations = async (req, res) => {
  try {
    const quotations = await Order.find({ type: "Quotation", isDeleted: true })
      .populate("items.product")
      .sort({ deletedAt: -1 });
    res.status(200).json({ success: true, data: quotations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Restore deleted quotation
exports.restoreQuotation = async (req, res) => {
  try {
    const quotation = await Order.findOneAndUpdate(
      { _id: req.params.id, type: "Quotation", isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!quotation) {
      return res.status(404).json({ success: false, message: "Deleted quotation not found" });
    }
    res.status(200).json({ success: true, message: "Quotation restored successfully", data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Orders CSV
exports.exportOrdersCSV = async (req, res) => {
  try {
    const orders = await Order.find().populate("items.product");
    if (!orders.length) return res.status(404).json({ message: "No orders found" });

    const rows = [];
    orders.forEach((order) => {
      order.items.forEach((it) => {
        rows.push({
          ID: order._id,
          OrderID: order.orderId,
          CustomerName: order.customerName,
          CustomerEmail: order.customerEmail,
          CustomerPhone: order.customerPhone,
          Address: order.address,
          Product: it.product?.name || "",
          Quantity: it.quantity,
          Price: it.price,
          TotalAmount: order.totalAmount,
          Type: order.type,
          Status: order.status || "",
          CreatedAt: order.createdAt,
        });
      });
    });

    const fields = Object.keys(rows[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment("orders.csv");
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Server error exporting orders" });
  }
};

// Export Quotations CSV
exports.exportQuotationsCSV = async (req, res) => {
  try {
    const quotations = await Order.find({ type: "Quotation", isDeleted: false }).populate("items.product");
    if (!quotations.length) return res.status(404).json({ message: "No quotations found" });

    const rows = [];
    quotations.forEach((q) => {
      q.items.forEach((it) => {
        rows.push({
          ID: q._id,
          OrderID: q.orderId,
          CustomerName: q.customerName,
          CustomerEmail: q.customerEmail,
          CustomerPhone: q.customerPhone,
          Address: q.address,
          Product: it.product?.name || "",
          Quantity: it.quantity,
          Price: it.price,
          TotalAmount: q.totalAmount,
          Type: q.type,
          Status: q.status || "",
          CreatedAt: q.createdAt,
        });
      });
    });

    const fields = Object.keys(rows[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment("quotations.csv");
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Server error exporting quotations" });
  }
};