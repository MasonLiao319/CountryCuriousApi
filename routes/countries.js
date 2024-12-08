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
    let countries = await redisClient.get('testCountriesList');
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
      await redisClient.set('testCountriesList', JSON.stringify(countries), { EX: 6000 }); // 缓存 10 分钟
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
 * 随机获取国家详情（/random）
 */
router.get('/random', async (req, res) => {
  try {
    const userId = process.env.NODE_ENV === 'development' ? 5 : req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User must be logged in to access country data' });
    }

    console.log(`Processing /random request for userId: ${userId}...`);
    const countries = await fetchCountries();

    if (!countries || countries.length === 0) {
      return res.status(404).json({ error: 'No countries available' });
    }

    // 随机选择一个国家
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    console.log(`Random country selected for userId ${userId}:`, randomCountry);

    res.status(200).json(randomCountry);
  } catch (error) {
    console.error('Error fetching random country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 搜索国家信息 (/search)
 */
router.get('/search', async (req, res) => {
  try {
    const userId = process.env.NODE_ENV === 'development' ? 5 : req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User must be logged in to search countries' });
    }

    const { name } = req.query;
    console.log(`Processing /search request for country: ${name}, userId: ${userId}`);

    if (!name) {
      return res.status(400).json({ error: 'Country name is required' });
    }

    const countries = await fetchCountries();

    if (!countries || countries.length === 0) {
      return res.status(404).json({ error: 'No countries available' });
    }

    // 搜索匹配的国家
    const country = countries.find(
      (country) => country.countryName.toLowerCase() === name.toLowerCase()
    );

    if (!country) {
      return res.status(404).json({ error: `Country with name '${name}' not found` });
    }

    console.log(`Search result for userId ${userId}:`, country);
    res.status(200).json(country);
  } catch (error) {
    console.error('Error searching for country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 测试接口：从 Redis 中读取缓存
 */
router.get('/countries/cache', async (req, res) => {
  try {
    const userId = process.env.NODE_ENV === 'development' ? 5 : req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User must be logged in to access cache' });
    }

    const cachedData = await redisClient.get('testCountriesList');
    if (cachedData) {
      console.log(`Retrieved countries from Redis cache for userId: ${userId}`);
      return res.status(200).json(JSON.parse(cachedData));
    } else {
      return res.status(404).json({ error: 'No cached countries found' });
    }
  } catch (redisError) {
    console.error('Error reading from Redis:', redisError.message);
    res.status(500).json({ error: 'Error reading from Redis', details: redisError.message });
  }
});

export default router;
