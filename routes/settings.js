import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const VALID_LANGUAGES = ['English', 'French']; 


router.get('/:userId', async (req, res) => {
  try {
    const userId =
      process.env.NODE_ENV === 'development' ? 5 : parseInt(req.params.userId, 10);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
        }, 
      });
    }

    res.status(200).json({
      notifications: settings.notifications,
      language: settings.language,
    });
  } catch (error) {
    console.error('Error fetching user settings:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.put('/:userId/notifications', async (req, res) => {
  try {
    const userId =
      process.env.NODE_ENV === 'development' ? 5 : parseInt(req.params.userId, 10);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { notifications } = req.body;

    if (typeof notifications !== 'boolean') {
      return res.status(400).json({ error: 'Notifications value must be a boolean' });
    }

    const updatedSettings = await prisma.userSettings.update({
      where: { userId },
      data: { notifications },
    });

    res.status(200).json({
      message: 'Notifications updated successfully',
      notifications: updatedSettings.notifications,
    });
  } catch (error) {
    console.error('Error updating notifications:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.put('/:userId/language', async (req, res) => {
  try {
    const userId =
      process.env.NODE_ENV === 'development' ? 5 : parseInt(req.params.userId, 10);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { language } = req.body;

    if (!VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({
        error: `Invalid language option. Valid options are: ${VALID_LANGUAGES.join(', ')}`,
      });
    }

    
    const updatedSettings = await prisma.userSettings.update({
      where: { userId },
      data: { language },
    });

    res.status(200).json({
      message: 'Language updated successfully',
      language: updatedSettings.language,
    });
  } catch (error) {
    console.error('Error updating language:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.delete('/:userId', async (req, res) => {
  try {
    const userId =
      process.env.NODE_ENV === 'development' ? 5 : parseInt(req.params.userId, 10);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

   
    const resetSettings = await prisma.userSettings.update({
      where: { userId },
      data: {
        notifications: true, 
        language: 'English', 
      },
    });

    res.status(200).json({
      message: 'Settings reset to default values',
      notifications: resetSettings.notifications,
      language: resetSettings.language,
    });
  } catch (error) {
    console.error('Error resetting user settings:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
