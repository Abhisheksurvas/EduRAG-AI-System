import { Router } from 'express';
import { QuizController } from '../controllers/quizController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/generate', requireAuth, QuizController.generate);
router.get('/', requireAuth, QuizController.getQuizzes);
router.get('/:id', requireAuth, QuizController.getQuizById);
router.post('/:id/submit', requireAuth, QuizController.submitQuiz);
router.post('/:id/retry', requireAuth, QuizController.retryQuiz);
router.delete('/:id', requireAuth, QuizController.deleteQuiz);

export default router;
