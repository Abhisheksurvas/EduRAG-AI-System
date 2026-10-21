import { Router } from 'express';
import { ProfileController } from '../controllers/profileController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, ProfileController.getProfile);
router.put('/', requireAuth, ProfileController.updateProfile);

export default router;
