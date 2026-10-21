import { Router } from 'express';
import { HealthController } from '../controllers/healthController.js';

const router = Router();

router.get('/', HealthController.check);
router.post('/connect-mongo', HealthController.connectMongo);

export default router;
