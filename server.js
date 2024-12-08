import express from 'express';
import morgan from 'morgan'; // 请求日志
import cors from 'cors'; // 跨域支持
import dotenv from 'dotenv'; // 环境变量
import redisClient from './lib/redisClient.js'; // Redis 客户端
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import countriesRouter from './routes/countries.js';
import savedCountriesRouter from './routes/savedCountries.js';
import quizQuestionsRouter from './routes/quizQuestions.js';
import savedQuizzesRouter from './routes/savedQuizzes.js';
import testRouter from './routes/test.js';
dotenv.config(); // 加载环境变量

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// **Redis Initialization**
(async () => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      await redisClient.connect();
      console.log('Redis connected successfully');
    }
  } catch (err) {
    console.error('Failed to connect to Redis:', err.message);
    process.exit(1); // 如果 Redis 连接失败，直接退出
  }
})();

// **Middleware Configuration**
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码的请求体
app.use(express.static('public')); // 服务静态文件

// 日志记录（仅在开发环境启用详细日志）
if (!isProduction) {
  app.use(morgan('dev'));
}

// CORS 配置
app.use(
  cors({
    origin: isProduction ? 'https://your-production-site.com' : 'http://localhost:3000',
    credentials: true,
  })
);

// **API Routes**
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/countries', countriesRouter);
app.use('/api/savedCountries', savedCountriesRouter);
app.use('/api/quizQuestions', quizQuestionsRouter);
app.use('/api/savedQuizzes', savedQuizzesRouter);
app.use('/api/test', testRouter)
// **404 Error Handling**
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// **Global Error Handling**
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// **Start Server**
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
