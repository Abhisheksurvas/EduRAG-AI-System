import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/documentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Store files in memory buffer for immediate processing and vector embedding
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max limit
  },
});

router.post('/upload', requireAuth, upload.single('file'), DocumentController.uploadDocument);
router.post('/seed-sample', requireAuth, DocumentController.seedSample);
router.get('/', requireAuth, DocumentController.getDocuments);
router.get('/:id', requireAuth, DocumentController.getDocumentById);
router.get('/:id/chunks', requireAuth, DocumentController.getDocumentChunks);
router.delete('/:id', requireAuth, DocumentController.deleteDocument);
router.delete('/', requireAuth, DocumentController.deleteAllDocuments);

export default router;
