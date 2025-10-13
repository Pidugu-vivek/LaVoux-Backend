import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Create test app with a router
export const createTestApp = (router, path) => {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
};

// Generate test tokens
export const generateToken = (userId, isAdmin = false) => {
  return jwt.sign(
    { id: userId, isAdmin },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
};

// Common test assertions
export const expectSuccess = (res, statusCode = 200) => {
  expect(res.status).toBe(statusCode);
  expect(res.body.success).toBe(true);
};

export const expectAuthError = (res) => {
  expect([401, 403]).toContain(res.status);
  expect(res.body.success).toBe(false);
};

export const expectValidationError = (res) => {
  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
};

// Reusable test data generators
export const createTestUser = (index = 0) => ({
  name: `Test User ${index}`,
  email: `testuser${Date.now()}_${index}@test.com`,
  password: 'TestPass123!'
});

export const createTestProduct = (name = 'Test Product') => ({
  name,
  description: 'Test description',
  price: 100,
  image: ['https://example.com/test.jpg'],
  category: 'Men',
  subCategory: 'Topwear',
  sizes: ['S', 'M', 'L'],
  bestseller: false,
  date: Date.now()
});

export const createTestOrder = (productId, amount = 100) => ({
  items: [{
    _id: productId,
    size: 'M',
    quantity: 1,
    price: amount
  }],
  amount,
  address: {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@order.com',
    phone: '1234567890',
    line1: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    zip: '12345',
    country: 'USA'
  }
});

// Auth helper - login and return token
export const loginUser = async (app, email, password) => {
  const res = await request(app)
    .post('/api/user/login')
    .send({ email, password });
  return res.body.token;
};

// Generic auth test - works for any endpoint
export const testRequiresAuth = (app, method, path, data = {}) => {
  it('should require authentication', async () => {
    const res = await request(app)[method](path).send(data);
    expectAuthError(res);
  });
};

// Generic admin auth test
export const testRequiresAdmin = (app, method, path, userToken, data = {}) => {
  it('should require admin authentication', async () => {
    const res = await request(app)[method](path)
      .set('token', userToken)
      .send(data);
    expectAuthError(res);
  });
};
