import express from 'express';
import axios from 'axios';
import redisClient from '../lib/redisClient.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

 // Function to fetch country data
async function fetchCountries() {
  try {
    
    let countries = await redisClient.get('countriesList');
    if (!countries) {
      console.log('Redis cache miss. Fetching countries from API...');
      
     // Attempt to get countries from Redis cache
      const response = await axios.get(
        'https://restcountries.com/v3.1/all?fields=name,flags,currencies,region,capital,languages',
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip,deflate,compress', 
          },
          timeout: 60000, // Set timeout for the API request
        }
      );

      // Process API response to extract necessary fields
      countries = response.data.slice(0, 30).map((country) => ({
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

      console.log('Processed countries:', countries);

      // Upsert processed countries into the database
      for (const country of countries) {
        await prisma.countryDetailsCard.upsert({
          where: { countryName: country.countryName }, // Check for existing record
          update: {}, // Update operation if record exists (empty here)
          create: {  // Create new record if it doesn't exist
            countryName: country.countryName,
            flagURL: country.flagURL,
            currencySymbol: country.currencySymbol,
            region: country.region,
            capital: country.capital,
            languages: country.languages,
          },
        });
      }

      // Cache processed countries in Redis with 1-hour expiration
      await redisClient.set('countriesList', JSON.stringify(countries), { EX: 3600 }); 
      console.log('Successfully cached countries data to Redis');
    } else {
      console.log('Fetching countries from Redis cache...');
      countries = JSON.parse(countries);// Parse cached data
    }

    return countries;// Return countries list
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    throw error; 
  }
}


 // Route: /random - Returns a random country
router.get('/random', async (req, res) => {
  try {
    // Get user ID, use development env
    const userId = process.env.NODE_ENV === 'development' ? 5 : req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User must be logged in to access country data' });
    }

    console.log(`Processing /random request for userId: ${userId}...`);
    const countries = await fetchCountries();

    if (!countries || countries.length === 0) {
      return res.status(404).json({ error: 'No countries available' });
    }

    // Select a random country from the list
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    console.log(`Random country selected for userId ${userId}:`, randomCountry);

    res.status(200).json(randomCountry);
  } catch (error) {
    console.error('Error fetching random country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


 // Route: /search - Searches for a country by name
router.get('/search', async (req, res) => {
  try {
    const userId = process.env.NODE_ENV === 'development' ? 5 : req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User must be logged in to search countries' });
    }

    const { name } = req.query;// Extract the name query parameter
    console.log(`Processing /search request for country: ${name}, userId: ${userId}`);

    if (!name) {
      return res.status(400).json({ error: 'Country name is required' });
    }

    const countries = await fetchCountries();// Fetch the countries list

    if (!countries || countries.length === 0) {
      return res.status(404).json({ error: 'No countries available' });
    }

    // Perform a case-insensitive search for the country
    const lowerCaseName = name.toLowerCase();
    const country = countries.find(
      (country) => country.countryName.toLowerCase().includes(lowerCaseName)
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

export default router;
