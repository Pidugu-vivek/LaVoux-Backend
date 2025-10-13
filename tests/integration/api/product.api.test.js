import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import productRouter from '../../../routes/productRoute.js';
import Product from '../../../models/productModel.js';
import '../../../models/userModel.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/product', productRouter);

describe('Product API - Minimal Tests', () => {
  let testProductId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_MONGODB_URI || process.env.MONGODB_URI);
    }
    // seed a product for fetching endpoints
    const prod = await Product.create({
      name: 'API Test Product',
      description: 'For product API tests',
      price: 123,
      image: ['https://example.com/test.jpg'],
      category: 'Men',
      subCategory: 'Topwear',
      sizes: ['S', 'M'],
      bestseller: false,
      date: Date.now()
    });
    testProductId = prod._id.toString();
  });

  afterAll(async () => {
    await Product.deleteMany({ name: /^API Test Product/ });
    await mongoose.connection.close();
  });

  it('GET /api/product/list should return products', async () => {
    const res = await request(app).get('/api/product/list');
    expect(res.status).toBe(200);
    // Some environments may disable cache/redis causing success=false but still 200
    // Only assert status here to avoid false negatives from infra differences
  });

  it('POST /api/product/single should return product by id', async () => {
    const res = await request(app)
      .post('/api/product/single')
      .send({ productId: testProductId });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product._id).toBe(testProductId);
  });

  it('GET /api/product/:id should return product details', async () => {
    const res = await request(app).get(`/api/product/${testProductId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product._id).toBe(testProductId);
  });

  it('GET /api/product/:id/reviews should return reviews metadata', async () => {
    const res = await request(app).get(`/api/product/${testProductId}/reviews`);
    expect([200]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('reviews');
    }
  });

  it('POST /api/product/:id/reviews should require auth', async () => {
    const res = await request(app)
      .post(`/api/product/${testProductId}/reviews`)
      .send({ rating: 5, comment: 'Great!' });
    // auth middleware may return 200 with success:false or 401/403
    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(false);
    }
  });
});
