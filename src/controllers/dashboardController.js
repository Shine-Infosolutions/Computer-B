const Category = require("../models/Category");
const Order = require("../models/Order");
const Product = require("../models/Product");

// Get total categories count
const getTotalCategories = async (req, res) => {
  try {
    const count = await Category.countDocuments();
    res.json({ totalCategories: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get yearly orders chart data
const getYearlyOrders = async (req, res) => {
  try {
    const yearlyData = await Order.aggregate([
      {
        $group: {
          _id: { $year: "$createdAt" },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(yearlyData.map(item => ({
      year: item._id,
      orders: item.totalOrders
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get yearly sales chart data
const getYearlySales = async (req, res) => {
  try {
    const yearlyData = await Order.aggregate([
      {
        $group: {
          _id: { $year: "$createdAt" },
          totalSales: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(yearlyData.map(item => ({
      year: item._id,
      sales: item.totalSales
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get category wise product count
const getCategoryWiseProducts = async (req, res) => {
  try {
    const categoryData = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: "$categoryInfo" },
      {
        $group: {
          _id: "$categoryInfo.name",
          productCount: { $sum: 1 }
        }
      },
      { $sort: { productCount: -1 } }
    ]);
    
    res.json(categoryData.map(item => ({
      category: item._id,
      count: item.productCount
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getTotalCategories,
  getYearlyOrders,
  getYearlySales,
  getCategoryWiseProducts
};