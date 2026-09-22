const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const orderValidation = require('./order.validation');
const validate = require('../../middleware/validation.middleware');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect); // All order routes require authentication

router.post(
  '/',
  orderValidation.createOrderValidation,
  validate,
  orderController.createOrder
);

router.get('/', orderController.getMyOrders);

router.get(
  '/:id',
  orderValidation.getOrderValidation,
  validate,
  orderController.getOrderById
);

module.exports = router;
