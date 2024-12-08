import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * 获取用户保存的国家列表
 * 示例：GET /api/savedCountries/:userId
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const savedCountries = await prisma.savedCountries.findMany({
      where: { userId: parseInt(userId, 10) },
      include: { country: true }, // 关联查询国家详细信息
    });

    if (!savedCountries || savedCountries.length === 0) {
      return res.status(404).json({ errorMessage: 'No saved countries found' });
    }

    const countries = savedCountries.map((savedCountry) => ({
      countryId: savedCountry.country.countryId,
      countryName: savedCountry.country.countryName,
    }));

    res.status(200).json({ savedCountries: countries });
  } catch (error) {
    console.error('Error fetching saved countries:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 保存国家到用户列表
 * 示例：POST /api/savedCountries
 */
router.post('/', async (req, res) => {
  try {
    const { userId, countryId } = req.body;

    if (!userId || !countryId) {
      return res.status(400).json({ error: 'User ID and Country ID are required' });
    }

    // 检查是否已经保存
    const existingRecord = await prisma.savedCountries.findUnique({
      where: {
        userId_countryId: { // Prisma 自动生成的复合唯一约束字段名
          userId: parseInt(userId, 10),
          countryId: parseInt(countryId, 10),
        },
      },
    });

    if (existingRecord) {
      return res.status(409).json({ errorMessage: 'Country already saved' });
    }

    // 保存新记录
    const savedCountry = await prisma.savedCountries.create({
      data: {
        userId: parseInt(userId, 10),
        countryId: parseInt(countryId, 10),
      },
    });

    res.status(201).json({ message: 'Country saved successfully', savedCountry });
  } catch (error) {
    console.error('Error saving country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 删除保存的国家
 * 示例：DELETE /api/savedCountries
 */
router.delete('/', async (req, res) => {
  try {
    const { userId, countryId } = req.body;

    if (!userId || !countryId) {
      return res.status(400).json({ error: 'User ID and Country ID are required' });
    }

    // 删除记录
    await prisma.savedCountries.deleteMany({
      where: {
        userId: parseInt(userId, 10),
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
