import { Router } from 'express';
import { NotesController } from '../controllers/notesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/generate', requireAuth, NotesController.generate);
router.get('/', requireAuth, NotesController.getNotes);
router.delete('/', requireAuth, NotesController.deleteAllNotes);
router.get('/:id', requireAuth, NotesController.getNoteById);
router.put('/:id', requireAuth, NotesController.updateNote);
router.delete('/:id', requireAuth, NotesController.deleteNote);
router.get('/:id/export', requireAuth, NotesController.exportNote);

export default router;
