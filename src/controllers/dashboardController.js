const Category = require("../models/Category");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendError, sendSuccess } = require('../utils/helpers');

const getTotalCategories = async (req, res) => {
  try {
    const count = await Category.countDocuments();
    sendSuccess(res, { totalCategories: count });
  } catch (error) {
    sendError(res, 500, 'Failed to get categories count', error);
  }
};

const getYearlyOrders = async (req, res) => {
  try {
    const yearlyData = await Order.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: { $year: "$createdAt" },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          year: "$_id",
          orders: "$totalOrders",
          _id: 0
        }
      }
    ]);
    
    sendSuccess(res, yearlyData);
  } catch (error) {
    sendError(res, 500, 'Failed to get yearly orders', error);
  }
};

const getYearlySales = async (req, res) => {
  try {
    const yearlyData = await Order.aggregate([
      { $match: { isDeleted: false, type: "Order" } },
      {
        $group: {
          _id: { $year: "$createdAt" },
          totalSales: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          year: "$_id",
          sales: "$totalSales",
          _id: 0
        }
      }
    ]);
    
    sendSuccess(res, yearlyData);
  } catch (error) {
    sendError(res, 500, 'Failed to get yearly sales', error);
  }
};

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
      { $sort: { productCount: -1 } },
      {
        $project: {
          category: "$_id",
          count: "$productCount",
          _id: 0
        }
      }
    ]);
    
    sendSuccess(res, categoryData);
  } catch (error) {
    sendError(res, 500, 'Failed to get category-wise products', error);
  }
};

module.exports = {
  getTotalCategories,
  getYearlyOrders,
  getYearlySales,
  getCategoryWiseProducts
};