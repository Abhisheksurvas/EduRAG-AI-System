import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DBStore } from '../models/store.js';
import { QuizGenerator } from '../rag/quizGenerator.js';

export class QuizController {
  static async generate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const { documentId, topic, difficulty, questionCount, timeLimit } = req.body;

      if (!documentId) {
        res.status(400).json({ success: false, message: 'Please select a study material document.' });
        return;
      }

      const doc = await DBStore.findDocumentById(documentId, studentId);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Selected document not found in your account.' });
        return;
      }

      if (doc.status !== 'ready') {
        res.status(400).json({
          success: false,
          message: `Document status is "${doc.status}". Please wait until document processing is complete.`,
        });
        return;
      }

      const count = parseInt(questionCount, 10) || 5;
      const diff = difficulty === 'Easy' || difficulty === 'Hard' ? difficulty : 'Medium';
      const limit = parseInt(timeLimit, 10) || 10;

      // Dynamic RAG quiz generation with strict context validation
      const generated = await QuizGenerator.generateQuiz({
        studentId,
        documentId,
        topic: topic || doc.originalName.replace(/\.[^/.]+$/, ''),
        difficulty: diff,
        questionCount: count,
        timeLimit: limit,
      });

      // Save quiz in MongoDB
      const quiz = await DBStore.createQuiz({
        studentId,
        documentId,
        documentName: doc.originalName,
        title: generated.title,
        topic: generated.topic,
        difficulty: diff,
        questionCount: generated.questions.length,
        timeLimit: limit,
        questions: generated.questions,
        status: 'unattempted',
        score: 0,
        totalAnswered: 0,
      });

      // Create notification
      await DBStore.createNotification({
        studentId,
        type: 'quiz',
        title: 'Quiz Ready',
        message: `Your dynamic quiz "${quiz.title}" (${quiz.questionCount} questions) has been generated.`,
        read: false,
      });

      res.status(201).json({ success: true, quiz });
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to generate quiz.' });
    }
  }

  static async getQuizzes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const quizzes = await DBStore.findQuizzesByStudent(studentId);

      // Separate into unattempted and history
      const unattempted = quizzes.filter((q: any) => q.status === 'unattempted' || q.status === 'in_progress');
      const history = quizzes.filter((q: any) => q.status === 'completed');

      res.json({
        success: true,
        quizzes,
        unattempted,
        history,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve quizzes.', error: error.message });
    }
  }

  static async getQuizById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const quizId = req.params.id;
      const quiz = await DBStore.findQuizById(quizId, studentId);

      if (!quiz) {
        res.status(404).json({ success: false, message: 'Quiz not found.' });
        return;
      }

      res.json({ success: true, quiz });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error fetching quiz.', error: error.message });
    }
  }

  static async submitQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const quizId = req.params.id;
      const { answers } = req.body; // map of { [questionNumber]: selectedOptionIndex }

      const quiz = await DBStore.findQuizById(quizId, studentId);
      if (!quiz) {
        res.status(404).json({ success: false, message: 'Quiz not found.' });
        return;
      }

      let correctCount = 0;
      let answeredCount = 0;

      const updatedQuestions = quiz.questions.map((q: any) => {
        const selected = answers ? answers[q.questionNumber] : null;
        const isAnswered = selected !== null && selected !== undefined;
        if (isAnswered) answeredCount++;

        const isCorrect = isAnswered && Number(selected) === Number(q.correctAnswer);
        if (isCorrect) correctCount++;

        return {
          ...q,
          selectedAnswer: isAnswered ? Number(selected) : null,
        };
      });

      const percentageScore = Math.round((correctCount / (quiz.questions.length || 1)) * 100);

      const updatedQuiz = await DBStore.updateQuiz(quizId, studentId, {
        questions: updatedQuestions,
        status: 'completed',
        score: percentageScore,
        totalAnswered: answeredCount,
        completedAt: new Date().toISOString(),
      });

      // Notification
      await DBStore.createNotification({
        studentId,
        type: 'quiz',
        title: 'Quiz Completed',
        message: `You scored ${percentageScore}% (${correctCount}/${quiz.questions.length}) on "${quiz.title}".`,
        read: false,
      });

      res.json({
        success: true,
        quiz: updatedQuiz,
        score: percentageScore,
        correctCount,
        totalQuestions: quiz.questions.length,
      });
    } catch (error: any) {
      console.error('Quiz submission error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit quiz.', error: error.message });
    }
  }

  static async retryQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const quizId = req.params.id;

      const quiz = await DBStore.findQuizById(quizId, studentId);
      if (!quiz) {
        res.status(404).json({ success: false, message: 'Quiz not found.' });
        return;
      }

      const resetQuestions = quiz.questions.map((q: any) => ({
        ...q,
        selectedAnswer: null,
      }));

      const updated = await DBStore.updateQuiz(quizId, studentId, {
        questions: resetQuestions,
        status: 'unattempted',
        score: 0,
        totalAnswered: 0,
        completedAt: null,
      });

      res.json({ success: true, quiz: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to reset quiz.', error: error.message });
    }
  }

  static async deleteQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const quizId = req.params.id;

      await DBStore.deleteQuiz(quizId, studentId);
      res.json({ success: true, message: 'Quiz deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete quiz.', error: error.message });
    }
  }
}
