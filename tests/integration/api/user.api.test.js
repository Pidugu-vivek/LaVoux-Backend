import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRouter from '../../../routes/userRoute.js';
import userModel from '../../../models/userModel.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/user', userRouter);

describe('User API - Critical Tests Only', () => {
  let userToken;
  const uniqueEmail = `test${Date.now()}@apitest.com`;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_MONGODB_URI || process.env.MONGODB_URI);
    }
  });

  afterAll(async () => {
    await userModel.deleteMany({ email: { $regex: /@apitest\.com$/ } });
    await mongoose.connection.close();
  });

  describe('Registration & Login', () => {
    it('should register new user and return token', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({
          name: 'Test User',
          email: uniqueEmail,
          password: 'TestPass123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      
      userToken = res.body.token;
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({
          email: uniqueEmail,
          password: 'TestPass123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should fail login with wrong password', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({
          email: uniqueEmail,
          password: 'WrongPassword'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Profile Management', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('token', userToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(uniqueEmail);
    });

    it('should reject profile request without token', async () => {
      const res = await request(app)
        .get('/api/user/profile');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Admin Login', () => {
    it('should login admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/user/admin')
        .send({
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });
});
