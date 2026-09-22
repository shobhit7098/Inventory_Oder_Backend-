const mongoose = require('mongoose');
const Order = require('./order.model');
const Product = require('../product/product.model');
const ApiError = require('../../utils/ApiError');
const messages = require('../../constants/messages');

const createOrder = async (userId, items) => {
  const session = await mongoose.startSession();
  let orderResult;

  try {
    await session.withTransaction(async () => {
      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const { productId, quantity } = item;

        // Use atomic conditional update to ensure stock doesn't go below zero
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: productId,
            stockQuantity: { $gte: quantity }
          },
          {
            $inc: { stockQuantity: -quantity }
          },
          { new: true, session }
        );

        if (!updatedProduct) {
          // Find out if product exists but out of stock, or doesn't exist
          const productExists = await Product.findById(productId).session(session);
          if (!productExists) {
            throw new ApiError(404, `Product with ID ${productId} not found`);
          } else {
            throw new ApiError(400, `Insufficient stock for product: ${productExists.name}`);
          }
        }

        const subtotal = updatedProduct.price * quantity;
        totalAmount += subtotal;

        orderItems.push({
          product: updatedProduct._id,
          name: updatedProduct.name,
          price: updatedProduct.price,
          quantity,
          subtotal
        });
      }

      const [order] = await Order.create([{
        user: userId,
        items: orderItems,
        totalAmount
      }], { session });

      orderResult = order;
    });
  } finally {
    await session.endSession();
  }

  return orderResult;
};

const getMyOrders = async (userId) => {
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
  return orders;
};

const getOrderById = async (orderId, userId) => {
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new ApiError(404, messages.ORDER_NOT_FOUND);
  }

  // Ensure user can only access their own order
  if (order.user.toString() !== userId.toString()) {
    throw new ApiError(403, messages.UNAUTHORIZED);
  }

  return order;
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById
};
