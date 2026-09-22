const Product = require('./product.model');
const ApiError = require('../../utils/ApiError');
const messages = require('../../constants/messages');

const createProduct = async (productData) => {
  const product = await Product.create(productData);
  return product;
};

const getProducts = async (queryParams) => {
  const { search, category, inStock, page = 1, limit = 10 } = queryParams;

  const query = {};

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  if (category) {
    query.category = category;
  }

  if (inStock === 'true') {
    query.stockQuantity = { $gt: 0 };
  } else if (inStock === 'false') {
    query.stockQuantity = 0;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(query).skip(skip).limit(limitNum),
    Product.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, messages.PRODUCT_NOT_FOUND);
  }
  return product;
};

const updateProduct = async (id, updateData) => {
  const product = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });
  
  if (!product) {
    throw new ApiError(404, messages.PRODUCT_NOT_FOUND);
  }
  
  return product;
};

const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw new ApiError(404, messages.PRODUCT_NOT_FOUND);
  }
  return product;
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
