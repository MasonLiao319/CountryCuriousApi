import express from 'express';
import axios from 'axios';
import redisClient from '../lib/redisClient.js';

const router = express.Router();


async function fetchCountries() {
  try {
    
    let countries = await redisClient.get('testCountriesList');
    if (!countries) {
      console.log('Redis cache miss. Fetching countries from API...');
      
      const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,flags,currencies,region,capital,languages', {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip,deflate,compress', 
        },
        timeout: 60000, 
      });

      
      countries = response.data.slice(0, 3).map((country) => ({
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

      await redisClient.set('testCountriesList', JSON.stringify(countries), { EX: 600 }); 
      console.log('Successfully cached countries data to Redis');
    } else {
      console.log('Fetching countries from Redis cache...');
      countries = JSON.parse(countries);
    }

    return countries;
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    throw error; 
  }
}


router.get('/random', async (req, res) => {
  try {
    console.log('Processing /random request...');
    const countries = await fetchCountries();

    if (!countries || countries.length === 0) {
      return res.status(404).json({ error: 'No countries available' });
    }

    
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    console.log('Random country selected:', randomCountry);

    res.status(200).json(randomCountry);
  } catch (error) {
    console.error('Error fetching random country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    console.log(`Processing /search request for country: ${name}`);

    if (!name) {
      return res.status(400).json({ error: 'Country name is required' });
    }

    const countries = await fetchCountries();

    if (!countries || countries.length === 0) {
      return res.status(404).json({ error: 'No countries available' });
    }

    const country = countries.find(
      (country) => country.countryName.toLowerCase() === name.toLowerCase()
    );

    if (!country) {
      return res.status(404).json({ error: `Country with name '${name}' not found` });
    }

    res.status(200).json(country);
  } catch (error) {
    console.error('Error searching for country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.get('/countries/cache', async (req, res) => {
  try {
    const cachedData = await redisClient.get('testCountriesList');
    if (cachedData) {
      console.log('Retrieved countries from Redis cache');
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
