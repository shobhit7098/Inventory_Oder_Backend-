const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const productService = require('./product.service');

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  return successResponse(res, 201, 'Product created successfully', product);
});

const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);
  return res.status(200).json({
    success: true,
    message: 'Products fetched successfully',
    data: result.products,
    pagination: result.pagination
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  return successResponse(res, 200, 'Product fetched successfully', product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return successResponse(res, 200, 'Product updated successfully', product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  return successResponse(res, 200, 'Product deleted successfully');
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
