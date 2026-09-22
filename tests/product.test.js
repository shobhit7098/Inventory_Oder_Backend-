const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/modules/product/product.model');
const User = require('../src/modules/user/user.model');
const { generateToken } = require('../src/utils/jwt');

require('dotenv').config();

let token;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123' });
  token = generateToken(user._id);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Product.deleteMany({});
});

describe('Product API', () => {
  it('should create a new product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Product',
        description: 'A great product',
        price: 99.99,
        stockQuantity: 10,
        category: 'electronics'
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Product');
  });

  it('should fetch products with pagination', async () => {
    await Product.create([
      { name: 'Prod 1', description: 'desc', price: 10, stockQuantity: 5, category: 'cat1' },
      { name: 'Prod 2', description: 'desc', price: 20, stockQuantity: 0, category: 'cat2' }
    ]);

    const res = await request(app).get('/api/products?page=1&limit=1');
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.total).toBe(2);
  });
});
