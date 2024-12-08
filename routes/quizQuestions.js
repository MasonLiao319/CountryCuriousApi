import express from 'express';
import axios from 'axios';
import redisClient from '../lib/redisClient.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();


async function fetchCountries() {
  try {
    let countries = await redisClient.get('countriesList');
    if (!countries) {
      console.log('Redis cache miss. Fetching countries from API...');
      const response = await axios.get(
        'https://restcountries.com/v3.1/all?fields=name,flags,currencies,region,capital,languages',
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip,deflate,compress',
          },
          timeout: 60000,
        }
      );

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

      await redisClient.set('countriesList', JSON.stringify(countries), { EX: 600 });
      console.log('Successfully cached countries data to Redis');
    } else {
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
    const userId = 5; 

    console.log(`Processing /random request for userId: ${userId}...`);
    const countries = await fetchCountries();

    if (!countries || countries.length === 0) {
      return res.status(404).json({ error: 'No countries available' });
    }

    
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    console.log(`Random country selected for userId ${userId}:`, randomCountry);

    let country = await prisma.countryDetailsCard.findFirst({
      where: { countryName: randomCountry.countryName },
    });

    if (!country) {
      
      country = await prisma.countryDetailsCard.create({
        data: {
          countryName: randomCountry.countryName,
          flagURL: randomCountry.flagURL,
          currencySymbol: randomCountry.currencySymbol,
          region: randomCountry.region,
          capital: randomCountry.capital,
          languages: randomCountry.languages,
        },
      });
      console.log('Country created:', country);
    }

   
    const countryId = country.countryId;

    
    let question = await prisma.quizQuestionsCard.findFirst({
      where: {
        countryId: countryId, 
        questionText: `What is the currency symbol of ${country.countryName}?`,
      },
    });


    if (!question) {
      const newQuestion = {
        questionText: `What is the currency symbol of ${country.countryName}?`,
        options: ['$', '€', '£', country.currencySymbol].sort(() => Math.random() - 0.5),
        correctAnswer: country.currencySymbol,
      };

      question = await prisma.quizQuestionsCard.create({
        data: {
          countryId: countryId, 
          questionText: newQuestion.questionText,
          options: newQuestion.options,
          correctAnswer: newQuestion.correctAnswer,
        },
      });
      console.log('Quiz question created:', question);
    }

    
    const userHistoryKey = `user:${userId}:quizHistory`;
    let userHistory = await redisClient.get(userHistoryKey);
    userHistory = userHistory ? JSON.parse(userHistory) : [];
    userHistory.push(country.countryName);

    if (userHistory.length > 10) {
      userHistory.shift();
    }

    await redisClient.set(userHistoryKey, JSON.stringify(userHistory), { EX: 3600 });

    res.status(200).json({
      question: {
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
      },
    });
  } catch (error) {
    console.error('Error fetching quiz question:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
