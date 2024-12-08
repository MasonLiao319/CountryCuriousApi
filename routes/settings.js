import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const VALID_LANGUAGES = ['English', 'French']; // 有效语言选项

/**
 * 获取用户设置
 * 路径: GET /api/userSettings/:userId
 */
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 验证用户是否存在
    const user = await prisma.users.findUnique({
      where: { userId: parseInt(userId, 10) },
    });

    if (!user) {
      return res.status(404).json({ errorMessage: 'User not found' });
    }

    // 获取用户设置
    const settings = await prisma.userSettings.findUnique({
      where: { userId: parseInt(userId, 10) },
    });

    if (!settings) {
      return res.status(404).json({ errorMessage: 'Settings not found' });
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

/**
 * 更新用户设置
 * 路径: PUT /api/userSettings/:userId
 * Body: { notifications, language }
 */
router.put('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { notifications, language } = req.body;

  try {
    // 验证用户是否存在
    const user = await prisma.users.findUnique({
      where: { userId: parseInt(userId, 10) },
    });

    if (!user) {
      return res.status(404).json({ errorMessage: 'User not found' });
    }

    // 验证语言选项是否合法
    if (language && !VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({
        errorMessage: `Invalid language option. Valid options are: ${VALID_LANGUAGES.join(', ')}`,
      });
    }

    // 更新用户设置
    const updatedSettings = await prisma.userSettings.update({
      where: { userId: parseInt(userId, 10) },
      data: {
        notifications: notifications ?? undefined, // 保持当前值如果未提供
        language: language ?? undefined,           // 保持当前值如果未提供
      },
    });

    res.status(200).json({
      message: 'Settings updated successfully',
      updatedSettings: {
        notifications: updatedSettings.notifications,
        language: updatedSettings.language,
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 重置用户设置为默认值
 * 路径: DELETE /api/userSettings/:userId
 */
router.delete('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 验证用户是否存在
    const user = await prisma.users.findUnique({
      where: { userId: parseInt(userId, 10) },
    });

    if (!user) {
      return res.status(404).json({ errorMessage: 'User not found' });
    }

    // 重置用户设置为默认值
    const resetSettings = await prisma.userSettings.update({
      where: { userId: parseInt(userId, 10) },
      data: {
        notifications: true, // 默认值
        language: 'English', // 默认值
      },
    });

    res.status(200).json({
      message: 'Settings reset to default values',
      resetSettings: {
        notifications: resetSettings.notifications,
        language: resetSettings.language,
      },
    });
  } catch (error) {
    console.error('Error resetting user settings:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
