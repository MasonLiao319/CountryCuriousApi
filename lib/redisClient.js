import { createClient } from 'redis';

let redisClient;

(async () => {
  if (!redisClient) {
    try {
      // initialize redis
      redisClient = createClient({
        url: 'redis://localhost:6379', 
        socket: {
          reconnectStrategy: (retries) => {
            console.warn(`Reconnecting to Redis... attempt #${retries}`);
            return Math.min(retries * 100, 5000); // Delay each attempt by 100ms to a maximum of 3000ms
          },
        },
      });

      // Redis event listeners
      redisClient.on('connect', () => {
        console.log('Redis client is connecting...');
      });

      redisClient.on('ready', () => {
        console.log('Redis client is ready.');
      });

      redisClient.on('end', () => {
        console.warn('Redis client disconnected.');
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err.message);
      });

      // connect redis
      await redisClient.connect();
      console.log('Redis connected successfully');
    } catch (err) {
      console.error('Failed to connect to Redis:', err.message);
      process.exit(1); //  Exit the application if Redis connection fails
    }
  }
})();

export default redisClient;
