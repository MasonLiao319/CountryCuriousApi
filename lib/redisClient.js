import { createClient } from 'redis';

let redisClient;

(async () => {
  if (!redisClient) {
    try {
      // 初始化 Redis 客户端
      redisClient = createClient({
        url: 'redis://localhost:6379', // 根据实际的 Redis 连接 URL 修改
        socket: {
          reconnectStrategy: (retries) => {
            console.warn(`Reconnecting to Redis... attempt #${retries}`);
            return Math.min(retries * 100, 5000); // 每次尝试延迟 100ms 到最大 3000ms
          },
        },
      });

      // Redis 事件监听
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

      // 连接 Redis
      await redisClient.connect();
      console.log('Redis connected successfully');
    } catch (err) {
      console.error('Failed to connect to Redis:', err.message);
      process.exit(1); // 如果 Redis 连接失败，直接退出应用
    }
  }
})();

export default redisClient;
