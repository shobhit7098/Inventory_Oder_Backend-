const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/modules/product/product.model');
const User = require('../src/modules/user/user.model');
const Order = require('../src/modules/order/order.model');
const { generateToken } = require('../src/utils/jwt');

const { MongoMemoryReplSet } = require('mongodb-memory-server');

require('dotenv').config();
jest.setTimeout(30000);

let tokenUserA;
let userA;
let tokenUserB;
let userB;
let testProduct;
let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
  
  userA = await User.create({ name: 'User A', email: 'userA@test.com', password: 'password123' });
  tokenUserA = generateToken(userA._id);
  
  userB = await User.create({ name: 'User B', email: 'userB@test.com', password: 'password123' });
  tokenUserB = generateToken(userB._id);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
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
  it('should allow authenticated user to create an order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        items: [{ productId: testProduct._id, quantity: 2 }]
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalAmount).toBe(2000); // Calculated by backend
  });

  it('should prevent unauthenticated user from creating an order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: testProduct._id, quantity: 2 }]
      });
      
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject non-existing product', async () => {
    const nonExistingId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        items: [{ productId: nonExistingId, quantity: 2 }]
      });
      
    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
  });

  it('should reject quantity <= 0', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        items: [{ productId: testProduct._id, quantity: 0 }]
      });
      
    expect(res.statusCode).toEqual(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'items[0].quantity' })
    ]));
  });

  it('should reject order if insufficient stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        items: [{ productId: testProduct._id, quantity: 10 }] // Only 5 available
      });
      
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('should reduce product stock successfully on order creation', async () => {
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        items: [{ productId: testProduct._id, quantity: 3 }]
      });
      
    const updatedProduct = await Product.findById(testProduct._id);
    expect(updatedProduct.stockQuantity).toBe(2);
  });

  it('should not trust client-provided price or totalAmount', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        totalAmount: 10, // Trying to cheat
        items: [{ productId: testProduct._id, quantity: 2, price: 5 }] // Trying to cheat
      });
      
    expect(res.statusCode).toEqual(201);
    // Backend should calculate totalAmount = 1000 * 2 = 2000
    expect(res.body.data.totalAmount).toBe(2000);
    expect(res.body.data.items[0].price).toBe(1000);
  });

  it('should allow user to retrieve their own orders', async () => {
    // User A creates order
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ items: [{ productId: testProduct._id, quantity: 1 }] });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].user).toBe(userA._id.toString());
  });

  it('should prevent user from accessing another user\'s order', async () => {
    // User A creates order
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ items: [{ productId: testProduct._id, quantity: 1 }] });
    
    const orderId = createRes.body.data._id;

    // User B tries to access User A's order
    const accessRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);
      
    expect(accessRes.statusCode).toEqual(403);
    expect(accessRes.body.message).toMatch(/Not authorized/i);
  });

  it('should handle invalid order ID correctly', async () => {
    const res = await request(app)
      .get('/api/orders/123invalidId')
      .set('Authorization', `Bearer ${tokenUserA}`);
      
    expect(res.statusCode).toEqual(400); // express-validator catches it
    expect(res.body.success).toBe(false);
  });
});

describe('Concurrency / Stock Race Condition', () => {
  it('should not allow stock to become negative when multiple concurrent orders are placed', async () => {
    // Set stock to exactly 1
    const limitedProduct = await Product.create({
      name: 'Limited Item',
      description: 'Only 1 left',
      price: 500,
      stockQuantity: 1,
      category: 'exclusive'
    });

    // Both users try to buy the last item at the exact same time
    const request1 = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ items: [{ productId: limitedProduct._id, quantity: 1 }] });
      
    const request2 = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ items: [{ productId: limitedProduct._id, quantity: 1 }] });

    // Run both requests concurrently
    const [res1, res2] = await Promise.all([request1, request2]);

    // One must succeed, one must fail
    const statuses = [res1.statusCode, res2.statusCode];
    expect(statuses).toContain(201); // One created
    expect(statuses).toContain(400); // One failed (insufficient stock)

    // Ensure final stock is exactly 0, not negative
    const finalProduct = await Product.findById(limitedProduct._id);
    expect(finalProduct.stockQuantity).toBe(0);
  });
});
