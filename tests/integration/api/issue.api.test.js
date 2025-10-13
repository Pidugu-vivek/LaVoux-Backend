import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRouter from '../../../routes/userRoute.js';
import issueRouter from '../../../routes/issueRoute.js';
import issueModel from '../../../models/issueModel.js';

dotenv.config();

const userApp = express();
userApp.use(express.json());
userApp.use('/api/user', userRouter);

const app = express();
app.use(express.json());
app.use('/api/issue', issueRouter);

describe('Issue API - Critical Tests Only', () => {
  let adminToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_MONGODB_URI || process.env.MONGODB_URI);
    }

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
    await issueModel.deleteMany({ email: { $regex: /@apitest\.com$/ } });
    await mongoose.connection.close();
  });

  describe('Issue Submission', () => {
    it('should create issue with valid data', async () => {
      const res = await request(app)
        .post('/api/issue')
        .send({
          name: 'Test User',
          email: `issue${Date.now()}@apitest.com`,
          subject: 'Test Issue',
          category: 'Product',
          message: 'This is a test issue'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.issue).toHaveProperty('_id');
    });

    it('should reject issue without required fields', async () => {
      const res = await request(app)
        .post('/api/issue')
        .send({ email: 'incomplete@apitest.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Admin Issue Management', () => {
    it('should list issues with admin token', async () => {
      const res = await request(app)
        .get('/api/issue')
        .set('token', adminToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.issues)).toBe(true);
    });

    it('should reject list without admin token', async () => {
      const res = await request(app)
        .get('/api/issue');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });
  });
});
