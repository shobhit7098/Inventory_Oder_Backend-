const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const orderService = require('./order.service');

const createOrder = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const order = await orderService.createOrder(req.user.id, items);
  return successResponse(res, 201, 'Order created successfully', order);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getMyOrders(req.user.id);
  return successResponse(res, 200, 'Orders fetched successfully', orders);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user.id);
  return successResponse(res, 200, 'Order fetched successfully', order);
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById
};
