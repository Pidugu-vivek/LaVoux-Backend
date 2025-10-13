# Backend Testing Documentation

**Minimal testing strategy** - Testing only critical business logic with Jest and Supertest.

## Test Structure

```
tests/
├── setup.js                           # Database setup/teardown
├── helpers/
│   └── testHelpers.js                 # Reusable test utilities
└── integration/
    └── api/
        ├── order.api.test.js          # Order management (critical for revenue)
        ├── user.api.test.js           # Auth & profile (security-critical)
        └── issue.api.test.js          # Issue/Support system
```

## Why Only 3 Test Files?

We focus on **high-risk, high-value** endpoints:
- **Orders**: Revenue-critical (payment, checkout)
- **Users**: Security-critical (auth, passwords)
- **Issues**: New feature that needs validation

Other endpoints (banners, cart, products, newsletter) are tested manually or skipped as they're:
- Simple CRUD operations
- Lower business impact
- Covered by integration with critical flows

## Running Tests

### Run all tests (watch mode)
```bash
npm test
```

### Run once with coverage report
```bash
npm run test:ci
```

### Run specific test file
```bash
npx jest tests/integration/api/order.api.test.js
```

### Run tests matching pattern
```bash
npx jest --testNamePattern="should create"
```

### Run tests for specific API
```bash
npx jest user.api.test.js
npx jest order.api.test.js
npx jest issue.api.test.js
```

## What's Tested

### 🔒 User API (`user.api.test.js`)
**Why**: Security-critical authentication
- Register new user with validation
- Login with credentials
- Admin login
- Password reset flow
- Get/update user profile

### 💰 Order API (`order.api.test.js`)
**Why**: Revenue-critical checkout flow
- Place COD orders
- Create Stripe payment sessions
- Get user order history
- Admin: List all orders
- Admin: Update order status
- Verify Stripe payments

### 🎫 Issue API (`issue.api.test.js`)
**Why**: New customer support feature
- Submit issues (public or authenticated)
- Admin: List and filter issues
- Admin: Update issue status
- Email notification on resolution

## Authentication in Tests

Most tests use placeholder tokens. To run tests with real authentication:

### Option 1: Generate Real Tokens
Update test files to call login endpoints and use returned tokens:

```javascript
beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/user/login')
    .send({ email: 'test@test.com', password: 'TestPass123!' });
  userToken = loginRes.body.token;
});
```

### Option 2: Use Environment Variables
Set tokens in `.env.test`:
```
TEST_USER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TEST_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Test Database Setup

### Recommended: Use Separate Test Database

In `.env.test`:
```
TEST_MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/e-commerce-test
```

This prevents tests from corrupting production/development data.

### Cleanup Strategy

Tests automatically clean up by:
- Deleting test users with `@apitest.com` emails
- Deleting products with `Test Product` names
- Deleting orders with test addresses
- Running `afterAll()` hooks to close connections

## Test Helpers (`helpers/testHelpers.js`)

Reusable utilities to reduce code duplication:

### Common Assertions
```javascript
expectSuccess(res)           // Checks 200 status + success: true
expectAuthError(res)         // Checks 401/403 error
expectValidationError(res)   // Checks 400 error
```

### Reusable Test Functions
```javascript
testRequiresAuth(app, 'post', '/api/order/place')
testRequiresAdmin(app, 'post', '/api/order/list', userToken)
```

### Data Generators
```javascript
createTestUser()      // Generates test user data
createTestProduct()   // Generates test product
createTestOrder()     // Generates test order
```

### Token Generator
```javascript
generateToken(userId, isAdmin)  // Creates JWT for auth tests
```

## Expected Test Results

### Passing Tests
Tests should pass when:
- Valid data is provided
- Authentication is correct
- Database is accessible
- Required env vars are set

### Expected Failures (by design)
Some tests verify error handling:
- 401/403 for missing/invalid auth tokens
- 400 for invalid data
- 404 for non-existent resources

## What's NOT Tested (And Why)

We intentionally skip tests for:
- **Products**: Simple CRUD, covered manually
- **Cart**: Tested indirectly through order flow
- **Banners**: Low-risk admin feature
- **Newsletter**: Secondary feature, low business impact

These can be tested with Postman or manually during development.

## Common Issues

### MongoDB Connection Errors
```
MongooseError: Cannot connect to database
```
**Fix**: Ensure `TEST_MONGODB_URI` is set and database is accessible.

### Authentication Failures
```
401 Unauthorized
```
**Fix**: Generate real tokens or implement token helpers in tests.

### Port Conflicts
```
EADDRINUSE: address already in use
```
**Fix**: Tests create isolated Express apps, no port conflicts should occur.

## Adding More Tests (If Needed)

If you need to add tests for other endpoints:
1. Create new file: `tests/integration/api/[feature].api.test.js`
2. Use helpers from `testHelpers.js` to keep it short
3. Focus on critical paths, skip edge cases
4. Clean up test data in `afterAll()`

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)
- [Mongoose Testing](https://mongoosejs.com/docs/jest.html)
