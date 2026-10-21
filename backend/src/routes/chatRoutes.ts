import { Router } from 'express';
import { ChatController } from '../controllers/chatController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/conversations', requireAuth, ChatController.getConversations);
router.post('/conversations', requireAuth, ChatController.createConversation);
router.get('/conversations/:id', requireAuth, ChatController.getConversationById);
router.put('/conversations/:id', requireAuth, ChatController.updateConversation);
router.delete('/conversations/:id', requireAuth, ChatController.deleteConversation);

router.post('/message', requireAuth, ChatController.sendMessage);
router.put('/message/:id', requireAuth, ChatController.editMessage);
router.post('/message/:id/regenerate', requireAuth, ChatController.regenerateAnswer);

export default router;
