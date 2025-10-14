import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cartRouter from '../../../routes/cartRoute.js';
import userRouter from '../../../routes/userRoute.js';
import Product from '../../../models/productModel.js';
import userModel from '../../../models/userModel.js';

dotenv.config();

// Increase default timeout for potentially slow CI environments
jest.setTimeout(30000);

// We need both routers: user for auth token, cart for operations
const userApp = express();
userApp.use(express.json());
userApp.use('/api/user', userRouter);

const app = express();
app.use(express.json());
app.use('/api/cart', cartRouter);

describe('Cart API - Minimal Tests', () => {
  let userToken;
  let testProductId;
  const uniqueEmail = `cart${Date.now()}@apitest.com`;
  let mongoServer;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
      if (uri) {
        await mongoose.connect(uri);
      } else {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
      }
    }

    // Seed product for cart operations
    const prod = await Product.create({
      name: 'API Cart Product',
      description: 'For cart API tests',
      price: 77,
      image: ['https://example.com/cart.jpg'],
      category: 'Men',
      subCategory: 'Topwear',
      sizes: ['M', 'L'],
      bestseller: false,
      date: Date.now()
    });
    testProductId = prod._id.toString();

    // Register and login to get token
    await request(userApp)
      .post('/api/user/register')
      .send({ name: 'Cart Tester', email: uniqueEmail, password: 'TestPass123!' });

    const loginRes = await request(userApp)
      .post('/api/user/login')
      .send({ email: uniqueEmail, password: 'TestPass123!' });

    userToken = loginRes.body.token;
  });

  afterAll(async () => {
    await userModel.deleteMany({ email: { $regex: /@apitest\.com$/ } });
    await Product.deleteMany({ name: /^API Cart Product/ });
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('POST /api/cart/add should add item with auth token', async () => {
    const res = await request(app)
      .post('/api/cart/add')
      .set('token', userToken)
      .send({ itemId: testProductId, size: 'M' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/cart/update should update quantity', async () => {
    const res = await request(app)
      .post('/api/cart/update')
      .set('token', userToken)
      .send({ itemId: testProductId, size: 'M', quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/cart/get should fetch cart data', async () => {
    const res = await request(app)
      .post('/api/cart/get')
      .set('token', userToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cartData).toBeDefined();
  });

  it('should require auth for cart endpoints', async () => {
    const res = await request(app)
      .post('/api/cart/add')
      .send({ itemId: testProductId, size: 'M' });

    // Your auth middleware returns 200 with success:false, or 401/403 in some cases
    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(false);
    }
  });
});
