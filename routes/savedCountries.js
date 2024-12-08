import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();


router.post('/save', async (req, res) => {
  try {
    const userId = 5; 
    const { countryId } = req.body; 

    if (!countryId) {
      return res.status(400).json({
        error: 'Country ID is required',
      });
    }

   
    const user = await prisma.users.findUnique({
      where: { userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingSavedCountry = await prisma.savedCountries.findUnique({
      where: {
        userId_countryId: {
          userId,
          countryId: parseInt(countryId, 10),
        },
      },
    });

    if (existingSavedCountry) {
      return res.status(409).json({ errorMessage: 'Country already saved' });
    }

    
    const savedCountry = await prisma.savedCountries.create({
      data: {
        userId,
        countryId: parseInt(countryId, 10),
      },
    });

    res.status(201).json({
      message: 'Country saved successfully',
      savedCountry,
    });
  } catch (error) {
    console.error('Error saving country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.get('/:userId', async (req, res) => {
  try {
   
    const userId =
      process.env.NODE_ENV === 'development' ? 5 : parseInt(req.params.userId, 10);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const savedCountries = await prisma.savedCountries.findMany({
      where: { userId },
      include: { country: true }, 
    });

    if (!savedCountries || savedCountries.length === 0) {
      return res.status(404).json({ errorMessage: 'No saved countries found' });
    }

    
    const countries = savedCountries.map((savedCountry) => ({
      countryId: savedCountry.country.countryId,
      countryName: savedCountry.country.countryName,
      flagURL: savedCountry.country.flagURL,
      currencySymbol: savedCountry.country.currencySymbol,
      region: savedCountry.country.region,
      capital: savedCountry.country.capital,
      languages: savedCountry.country.languages,
    }));

    res.status(200).json({ savedCountries: countries });
  } catch (error) {
    console.error('Error fetching saved countries:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.delete('/delete', async (req, res) => {
  try {
    const userId = 5; 
    const { countryId } = req.body;

    if (!countryId) {
      return res.status(400).json({ error: 'Country ID is required' });
    }

  
    await prisma.savedCountries.deleteMany({
      where: {
        userId,
        countryId: parseInt(countryId, 10),
      },
    });

    res.status(200).json({ message: 'Country removed successfully' });
  } catch (error) {
    console.error('Error deleting saved country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
