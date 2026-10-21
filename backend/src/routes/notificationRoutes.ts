import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, NotificationController.getNotifications);
router.put('/:id/read', requireAuth, NotificationController.markAsRead);
router.put('/read-all', requireAuth, NotificationController.markAllAsRead);
router.delete('/:id', requireAuth, NotificationController.deleteNotification);
router.delete('/clear-all', requireAuth, NotificationController.deleteAllNotifications);
router.delete('/', requireAuth, NotificationController.deleteAllNotifications);

export default router;
