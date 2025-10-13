import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

// Increase Jest timeout for CI where cold starts can be slower
jest.setTimeout(30000);

let mongoServer;

// Connect before all tests
beforeAll(async () => {
  // Prefer provided URIs; if absent (or in CI without secrets), use in-memory Mongo
  let uri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;

  if (!uri) {
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri; // so test files using env will see it
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    console.log('✅ Test DB connected');
  }
});

// Clear test data after each test (optional)
afterEach(async () => {
  // Uncomment if you want to clear collections after each test
  // const collections = mongoose.connection.collections;
  // for (const key in collections) {
  //   await collections[key].deleteMany();
  // }
});

// Disconnect after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('✅ Test DB disconnected');
});
