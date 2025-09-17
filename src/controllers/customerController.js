const Order = require("../models/Order");
const mongoose = require("mongoose");

// Get customers with search functionality
const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    
    let matchStage = {};
    if (search) {
      const searchConditions = [
        { customerName: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } }
      ];
      
      if (mongoose.Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: new mongoose.Types.ObjectId(search) });
      }
      
      matchStage = { $or: searchConditions };
    }

    const customers = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$customerEmail",
          customerName: { $first: "$customerName" },
          customerEmail: { $first: "$customerEmail" },
          customerPhone: { $first: "$customerPhone" },
          address: { $first: "$address" },
          orders: {
            $push: {
              _id: "$_id",
              orderId: "$orderId",
              quoteId: "$quoteId",
              type: "$type",
              totalAmount: "$totalAmount",
              status: "$status",
              createdAt: "$createdAt",
              items: "$items"
            }
          },
          totalOrders: { $sum: 1 },
          lastOrderDate: { $max: "$createdAt" }
        }
      },
      { $sort: { lastOrderDate: -1 } }
    ]);

    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get customer orders by customer ID
const getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;
    const orders = await Order.find({ customerEmail: customerId }).populate('items.product').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCustomers, getCustomerOrders };