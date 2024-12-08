import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

/**
 * 获取用户已保存的测验问题列表
 * 路径: GET /api/savedQuizzes/:userId
 */
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 验证用户是否存在
    const user = await prisma.users.findUnique({
      where: { userId: parseInt(userId, 10) },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 获取已保存的测验问题
    const savedQuizzes = await prisma.savedQuizzes.findMany({
      where: { userId: parseInt(userId, 10) },
      include: {
        question: true, // 包含问题详情
      },
    });

    if (!savedQuizzes.length) {
      return res.status(404).json({ error: 'No saved quizzes found' });
    }

    const response = savedQuizzes.map((quiz) => ({
      savedQuizId: quiz.savedQuizId,
      questionId: quiz.questionId,
      questionText: quiz.question.questionText,
      options: quiz.question.options,
      correctAnswer: quiz.question.correctAnswer,
    }));

    res.status(200).json({ savedQuizzes: response });
  } catch (error) {
    console.error('Error fetching saved quizzes:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 保存测验问题
 * 路径: POST /api/savedQuizzes
 * Body: { userId, questionId }
 */
router.post('/', async (req, res) => {
  const { userId, questionId } = req.body;

  try {
    // 验证用户是否存在
    const user = await prisma.users.findUnique({
      where: { userId: parseInt(userId, 10) },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 验证测验问题是否存在
    const question = await prisma.quizQuestionsCard.findUnique({
      where: { questionId: parseInt(questionId, 10) },
    });

    if (!question) {
      return res.status(404).json({ error: 'Quiz question not found' });
    }

    // 确保用户不会重复保存同一个问题
    const existingSave = await prisma.savedQuizzes.findUnique({
      where: {
        userId_questionId: {
          userId: parseInt(userId, 10),
          questionId: parseInt(questionId, 10),
        },
      },
    });

    if (existingSave) {
      return res.status(400).json({ error: 'Quiz question already saved' });
    }

    // 保存测验问题
    const savedQuiz = await prisma.savedQuizzes.create({
      data: {
        userId: parseInt(userId, 10),
        questionId: parseInt(questionId, 10),
      },
    });

    res.status(201).json({
      message: 'Quiz question saved successfully',
      savedQuizId: savedQuiz.savedQuizId,
    });
  } catch (error) {
    console.error('Error saving quiz question:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 删除已保存的测验问题
 * 路径: DELETE /api/savedQuizzes
 * Body: { userId, questionId }
 */
router.delete('/', async (req, res) => {
  const { userId, questionId } = req.body;

  try {
    // 验证用户是否存在
    const user = await prisma.users.findUnique({
      where: { userId: parseInt(userId, 10) },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 验证测验问题是否已保存
    const savedQuiz = await prisma.savedQuizzes.findUnique({
      where: {
        userId_questionId: {
          userId: parseInt(userId, 10),
          questionId: parseInt(questionId, 10),
        },
      },
    });

    if (!savedQuiz) {
      return res.status(404).json({ error: 'Saved quiz not found' });
    }

    // 删除已保存的测验问题
    await prisma.savedQuizzes.delete({
      where: {
        userId_questionId: {
          userId: parseInt(userId, 10),
          questionId: parseInt(questionId, 10),
        },
      },
    });

    res.status(200).json({ message: 'Saved quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved quiz:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
