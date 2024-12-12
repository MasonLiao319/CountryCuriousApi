import express from 'express';
import morgan from 'morgan'; 
import cors from 'cors'; 
import dotenv from 'dotenv'; 
import redisClient from './lib/redisClient.js'; 
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import countriesRouter from './routes/countries.js';
import savedCountriesRouter from './routes/savedCountries.js';
import quizQuestionsRouter from './routes/quizQuestions.js';
import savedQuizzesRouter from './routes/savedQuizzes.js';
import testRouter from './routes/test.js';
dotenv.config(); 

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
    process.exit(1); 
  }
})();

// **Middleware Configuration**
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public')); 

if (!isProduction) {
  app.use(morgan('dev'));
}

// CORS 
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
