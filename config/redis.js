import { createClient } from 'redis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
    url: redisUrl
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Redis connected successfully.');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
};

export { redisClient, connectRedis };
