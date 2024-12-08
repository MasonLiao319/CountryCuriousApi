import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();


router.get('/:userId', async (req, res) => {
  try {
    
    const userId =
      process.env.NODE_ENV === 'development' ? 5 : parseInt(req.params.userId, 10);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const savedQuizzes = await prisma.savedQuizzes.findMany({
      where: { userId },
      include: {
        question: true, 
      },
    });

    if (!savedQuizzes || savedQuizzes.length === 0) {
      return res.status(404).json({ error: 'No saved quizzes found' });
    }

   
    const quizzes = savedQuizzes.map((quiz) => ({
      savedQuizId: quiz.savedQuizId,
      questionId: quiz.questionId,
      questionText: quiz.question.questionText,
      options: quiz.question.options,
      correctAnswer: quiz.question.correctAnswer,
    }));

    res.status(200).json({ savedQuizzes: quizzes });
  } catch (error) {
    console.error('Error fetching saved quizzes:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.post('/save', async (req, res) => {
  try {
    const userId = 5; 
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required' });
    }

    const question = await prisma.quizQuestionsCard.findUnique({
      where: { questionId: parseInt(questionId, 10) },
    });

    if (!question) {
      return res.status(404).json({ error: 'Quiz question not found' });
    }


    const existingSave = await prisma.savedQuizzes.findUnique({
      where: {
        userId_questionId: {
          userId,
          questionId: parseInt(questionId, 10),
        },
      },
    });

    if (existingSave) {
      return res.status(409).json({ error: 'Quiz question already saved' });
    }

    const savedQuiz = await prisma.savedQuizzes.create({
      data: {
        userId,
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


router.delete('/delete', async (req, res) => {
  try {
    const userId = 5; 
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required' });
    }

    
    const savedQuiz = await prisma.savedQuizzes.findUnique({
      where: {
        userId_questionId: {
          userId,
          questionId: parseInt(questionId, 10),
        },
      },
    });

    if (!savedQuiz) {
      return res.status(404).json({ error: 'Saved quiz not found' });
    }

    await prisma.savedQuizzes.delete({
      where: {
        userId_questionId: {
          userId,
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
