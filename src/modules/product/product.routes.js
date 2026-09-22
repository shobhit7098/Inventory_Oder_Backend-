const express = require('express');
const router = express.Router();
const productController = require('./product.controller');
const productValidation = require('./product.validation');
const validate = require('../../middleware/validation.middleware');
const { protect } = require('../../middleware/auth.middleware');

router.post(
  '/',
  protect,
  productValidation.createProductValidation,
  validate,
  productController.createProduct
);

router.get(
  '/',
  productValidation.queryProductValidation,
  validate,
  productController.getProducts
);

router.get('/:id', productController.getProductById);

router.patch(
  '/:id',
  protect,
  productValidation.updateProductValidation,
  validate,
  productController.updateProduct
);

router.delete('/:id', protect, productController.deleteProduct);

module.exports = router;
