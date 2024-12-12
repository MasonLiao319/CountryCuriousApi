import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();


// POST route to save a country to the user's saved countries list
router.post('/save', async (req, res) => {
  try {
    const userId = 5; 
    const { countryId } = req.body; 


    // Validate that countryId is provided in the request body
    if (!countryId) {
      return res.status(400).json({
        error: 'Country ID is required',
      });
    }

   
    // Fetch the user from the database to ensure they exist
    const user = await prisma.users.findUnique({
      where: { userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }


    // Check if the country has already been saved by the user
    const existingSavedCountry = await prisma.savedCountries.findUnique({
      where: {
        userId_countryId: {
          userId,
          countryId: parseInt(countryId, 10),
        },
      },
    });


    // If the country has already been saved, return a conflict response
    if (existingSavedCountry) {
      return res.status(409).json({ errorMessage: 'Country already saved' });
    }

    // Save the new country to the database for the user
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

// GET route to fetch saved countries for a specific user
router.get('/:userId', async (req, res) => {
  try {
   
    const userId =
      process.env.NODE_ENV === 'development' ? 5 : parseInt(req.params.userId, 10);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch saved countries for the given user
    const savedCountries = await prisma.savedCountries.findMany({
      where: { userId },
      include: { country: true }, 
    });

    // If no saved countries are found, return a not found error
    if (!savedCountries || savedCountries.length === 0) {
      return res.status(404).json({ errorMessage: 'No saved countries found' });
    }

    // Format the saved countries data to include relevant country information
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

// DELETE route to remove a saved country for a user
router.delete('/delete', async (req, res) => {
  try {
    const userId = 5; 
    const { countryId } = req.body;

    // Validate that countryId is provided in the request body
    if (!countryId) {
      return res.status(400).json({ error: 'Country ID is required' });
    }

    // Delete the saved country from the database for the given user and country
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
