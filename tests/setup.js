import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Use test database
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;

// Connect before all tests
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGODB_URI);
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
  await mongoose.connection.close();
  console.log('✅ Test DB disconnected');
});
