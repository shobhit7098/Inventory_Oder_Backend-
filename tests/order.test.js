const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/modules/product/product.model');
const User = require('../src/modules/user/user.model');
const Order = require('../src/modules/order/order.model');
const { generateToken } = require('../src/utils/jwt');

require('dotenv').config();

let token;
let user;
let testProduct;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  user = await User.create({ name: 'Buyer', email: 'buyer@test.com', password: 'password123' });
  token = generateToken(user._id);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Order.deleteMany({});
  await Product.deleteMany({});
  testProduct = await Product.create({
    name: 'Laptop',
    description: 'A fast laptop',
    price: 1000,
    stockQuantity: 5,
    category: 'electronics'
  });
});

describe('Order API', () => {
  it('should create an order successfully and reduce stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { productId: testProduct._id, quantity: 2 }
        ]
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalAmount).toBe(2000);

    // Verify stock was reduced
    const updatedProduct = await Product.findById(testProduct._id);
    expect(updatedProduct.stockQuantity).toBe(3);
  });

  it('should fail when ordering more than available stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { productId: testProduct._id, quantity: 10 }
        ]
      });
      
    expect(res.statusCode).toEqual(400); // Bad request or Insufficient stock
    expect(res.body.success).toBe(false);

    // Verify stock was NOT reduced
    const updatedProduct = await Product.findById(testProduct._id);
    expect(updatedProduct.stockQuantity).toBe(5);
  });
});
