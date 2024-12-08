import express from 'express';
import axios from 'axios';
import redisClient from '../lib/redisClient.js';

const router = express.Router();

/**
 * 获取国家数据（从 Redis 或 API）
 */
async function fetchCountries() {
  try {
    // 从 Redis 中获取数据
    let countries = await redisClient.get('countriesList'); // 键名为 countriesList
    if (!countries) {
      console.log('Redis cache miss. Fetching countries from API...');
      
      // 请求 API 并限制字段
      const response = await axios.get(
        'https://restcountries.com/v3.1/all?fields=name,flags,currencies,region,capital,languages',
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip,deflate,compress', // 启用压缩
          },
          timeout: 60000, // 设置超时时间
        }
      );

      // 仅保留前 10 个国家并提取所需字段
      countries = response.data.slice(0, 10).map((country) => ({
        countryName: country.name?.common || 'unknown',
        flagURL: country.flags?.svg || country.flags?.png || '',
        currencySymbol: country.currencies
          ? Object.values(country.currencies)[0]?.symbol || 'N/A'
          : 'N/A',
        region: country.region || 'unknown',
        capital: country.capital ? country.capital[0] || 'unknown' : 'unknown',
        languages: country.languages
          ? Object.values(country.languages).join(', ')
          : 'unknown',
      }));

      // 写入 Redis 缓存
      await redisClient.set('countriesList', JSON.stringify(countries), { EX: 600 }); // 缓存 10 分钟
      console.log('Successfully cached countries data to Redis');
    } else {
      console.log('Fetching countries from Redis cache...');
      countries = JSON.parse(countries);
    }

    return countries;
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    throw error; // 将错误抛出以便上层处理
  }
}

/**
 * 获取随机 Quiz 问题
 */
router.get('/random', async (req, res) => {
  try {
    // 获取用户 ID
    const userId = process.env.NODE_ENV === 'development' ? 5 : req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User must be logged in to access quiz questions' });
    }

    console.log(`Processing /random request for userId: ${userId}...`);
    const countries = await fetchCountries();

    if (!countries || countries.length === 0) {
      return res.status(404).json({ error: 'No countries available' });
    }

    // 随机选择一个国家
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    console.log(`Random country selected for userId ${userId}:`, randomCountry);

    // 随机生成 Quiz 问题
    const quizOptions = generateQuizQuestions(randomCountry);
    if (!quizOptions) {
      return res.status(500).json({ error: 'Failed to generate quiz question' });
    }

    // 保存用户的 quiz 国家选择记录到 Redis（假设用户行为需要记录）
    const userHistoryKey = `user:${userId}:quizHistory`;
    let userHistory = await redisClient.get(userHistoryKey);
    userHistory = userHistory ? JSON.parse(userHistory) : [];
    userHistory.push(randomCountry.countryName);

    // 限制历史记录长度
    if (userHistory.length > 10) {
      userHistory.shift();
    }

    await redisClient.set(userHistoryKey, JSON.stringify(userHistory), { EX: 3600 }); // 保存 1 小时
    console.log(`Updated quiz history for userId ${userId}:`, userHistory);

    res.status(200).json(quizOptions);
  } catch (error) {
    console.error('Error fetching quiz question:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 根据国家详情生成随机 Quiz 问题
 */
function generateQuizQuestions(country) {
  const questions = [
    {
      questionText: `What is the currency symbol of ${country.countryName}?`,
      options: ['$', '€', '£', country.currencySymbol].sort(() => Math.random() - 0.5),
      correctAnswer: country.currencySymbol,
    },
    {
      questionText: `Which region does ${country.countryName} belong to?`,
      options: ['Europe', 'Africa', 'Asia', country.region].sort(() => Math.random() - 0.5),
      correctAnswer: country.region,
    },
    {
      questionText: `What is the capital of ${country.countryName}?`,
      options: ['Unknown', 'Berlin', 'Paris', country.capital].sort(() => Math.random() - 0.5),
      correctAnswer: country.capital,
    },
    {
      questionText: `Which language is spoken in ${country.countryName}?`,
      options: country.languages.split(',').map((lang) => lang.trim()).sort(() => Math.random() - 0.5),
      correctAnswer: country.languages.split(',')[0].trim(),
    },
  ];

  // 随机选择一个问题
  return questions[Math.floor(Math.random() * questions.length)];
}

export default router;
