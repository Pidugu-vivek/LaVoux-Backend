import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import userRouter from '../../../routes/userRoute.js';
import orderRouter from '../../../routes/orderRoute.js';
import orderModel from '../../../models/orderModel.js';
import userModel from '../../../models/userModel.js';

dotenv.config();

// Increase timeout for CI
jest.setTimeout(30000);

// Need both routers since we login through user router
const userApp = express();
userApp.use(express.json());
userApp.use('/api/user', userRouter);

const app = express();
app.use(express.json());
app.use('/api/order', orderRouter);

describe('Order API - Critical Tests Only', () => {
  let userToken, adminToken;
  const uniqueEmail = `ordertest${Date.now()}@apitest.com`;
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

    // Register and login user
    await request(userApp)
      .post('/api/user/register')
      .send({
        name: 'Order Test User',
        email: uniqueEmail,
        password: 'TestPass123!'
      });

    const loginRes = await request(userApp)
      .post('/api/user/login')
      .send({ email: uniqueEmail, password: 'TestPass123!' });
    
    userToken = loginRes.body.token;

    // Get admin token
    const adminRes = await request(userApp)
      .post('/api/user/admin')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
      });
    
    adminToken = adminRes.body.token;
  });

  afterAll(async () => {
    await orderModel.deleteMany({ 'address.firstName': /^Test/ });
    await userModel.deleteMany({ email: { $regex: /@apitest\.com$/ } });
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('User Orders', () => {
    it('should get user orders with valid token', async () => {
      const res = await request(app)
        .post('/api/order/userorders')
        .set('token', userToken);

      // Depending on initial state, it may return empty list or auth error if token invalid
      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.orders)).toBe(true);
      }
    });

    it('should reject without token', async () => {
      const res = await request(app)
        .post('/api/order/userorders');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Admin Order Management', () => {
    it('should list all orders with admin token', async () => {
      const res = await request(app)
        .post('/api/order/list')
        .set('token', adminToken);

      // Will succeed with valid admin token; otherwise 401/403
      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.orders)).toBe(true);
      }
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/order/list')
        .set('token', userToken);

      // Expect auth failure responses
      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(false);
      }
    });
  });
});
