const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/modules/product/product.model');
const User = require('../src/modules/user/user.model');
const { generateToken } = require('../src/utils/jwt');

const { MongoMemoryServer } = require('mongodb-memory-server');

require('dotenv').config();
jest.setTimeout(30000);

let token;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  const user = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123' });
  token = generateToken(user._id);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Product.deleteMany({});
});

describe('Product API', () => {
  it('should allow authenticated user to create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Wireless Mouse',
        description: 'Bluetooth mouse',
        price: 25.99,
        stockQuantity: 50,
        category: 'electronics'
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Wireless Mouse');
  });

  it('should prevent unauthenticated user from creating a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({
        name: 'Wireless Mouse',
        description: 'Bluetooth mouse',
        price: 25.99,
        stockQuantity: 50,
        category: 'electronics'
      });
      
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid product data', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '', // Empty name
        description: 'Bluetooth mouse',
        price: -10, // Invalid price
        stockQuantity: 50,
        category: 'electronics'
      });
      
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'name' }),
      expect.objectContaining({ field: 'price' })
    ]));
  });

  it('should get products', async () => {
    await Product.create({ name: 'Mouse', description: 'desc', price: 10, stockQuantity: 5, category: 'electronics' });
    
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBe(1);
  });

  it('should get product by ID', async () => {
    const product = await Product.create({ name: 'Mouse', description: 'desc', price: 10, stockQuantity: 5, category: 'electronics' });
    
    const res = await request(app).get(`/api/products/${product._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.name).toBe('Mouse');
  });

  it('should handle invalid product ID correctly', async () => {
    const res = await request(app).get('/api/products/123invalidId');
    expect(res.statusCode).toEqual(404); // CastError mapped to 404 in error handler
    expect(res.body.success).toBe(false);
  });

  it('should update a product', async () => {
    const product = await Product.create({ name: 'Mouse', description: 'desc', price: 10, stockQuantity: 5, category: 'electronics' });
    
    const res = await request(app)
      .patch(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 15 });
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.price).toBe(15);
  });

  it('should delete a product', async () => {
    const product = await Product.create({ name: 'Mouse', description: 'desc', price: 10, stockQuantity: 5, category: 'electronics' });
    
    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.statusCode).toEqual(200);
    
    const checkProduct = await Product.findById(product._id);
    expect(checkProduct).toBeNull();
  });

  it('should search products by name', async () => {
    await Product.create([
      { name: 'Wireless Mouse', description: 'desc', price: 10, stockQuantity: 5, category: 'electronics' },
      { name: 'Wired Keyboard', description: 'desc', price: 20, stockQuantity: 5, category: 'electronics' }
    ]);

    const res = await request(app).get('/api/products?search=Mouse');
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Wireless Mouse');
  });

  it('should filter products by category', async () => {
    await Product.create([
      { name: 'Mouse', description: 'desc', price: 10, stockQuantity: 5, category: 'electronics' },
      { name: 'Desk', description: 'desc', price: 20, stockQuantity: 5, category: 'furniture' }
    ]);

    const res = await request(app).get('/api/products?category=furniture');
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Desk');
  });

  it('should filter products by availability', async () => {
    await Product.create([
      { name: 'Mouse', description: 'desc', price: 10, stockQuantity: 5, category: 'electronics' },
      { name: 'Keyboard', description: 'desc', price: 20, stockQuantity: 0, category: 'electronics' }
    ]);

    const resInStock = await request(app).get('/api/products?inStock=true');
    expect(resInStock.body.data.length).toBe(1);
    expect(resInStock.body.data[0].name).toBe('Mouse');

    const resOutOfStock = await request(app).get('/api/products?inStock=false');
    expect(resOutOfStock.body.data.length).toBe(1);
    expect(resOutOfStock.body.data[0].name).toBe('Keyboard');
  });

  it('should paginate products', async () => {
    const products = Array.from({ length: 15 }, (_, i) => ({
      name: `Product ${i}`,
      description: 'desc',
      price: 10,
      stockQuantity: 5,
      category: 'test'
    }));
    await Product.insertMany(products);

    const res = await request(app).get('/api/products?page=2&limit=10');
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBe(5);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.total).toBe(15);
  });
});
