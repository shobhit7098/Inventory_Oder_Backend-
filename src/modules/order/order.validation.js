const { body, param } = require('express-validator');

const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be an array with at least one item'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

const getOrderValidation = [
  param('id').isMongoId().withMessage('Invalid order ID')
];

module.exports = {
  createOrderValidation,
  getOrderValidation
};
