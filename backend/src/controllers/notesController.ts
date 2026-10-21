import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DBStore } from '../models/store.js';
import { NotesGenerator } from '../rag/notesGenerator.js';

export class NotesController {
  static async generate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const { documentId, unit, chapter, promptType, customPrompt } = req.body;

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

      // Generate dynamic notes from document chunks
      const generated = await NotesGenerator.generateNotes({
        studentId,
        documentId,
        unit,
        chapter,
        promptType: promptType || 'Five key takeaways',
        customPrompt,
      });

      // Save note in MongoDB
      const note = await DBStore.createNote({
        studentId,
        documentId,
        documentName: doc.originalName,
        title: generated.title,
        unit: unit || 'General',
        chapter: chapter || 'All Chapters',
        prompt: promptType || 'Five key takeaways',
        content: generated.content,
      });

      // Notification
      await DBStore.createNotification({
        studentId,
        type: 'notes',
        title: 'Notes Generated',
        message: `Notes for "${doc.originalName}" generated successfully (${generated.title}).`,
        read: false,
      });

      res.status(201).json({ success: true, note });
    } catch (error: any) {
      console.error('Generate notes error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate notes.', error: error.message });
    }
  }

  static async getNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const notes = await DBStore.findNotesByStudent(studentId);
      res.json({ success: true, notes });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch notes.', error: error.message });
    }
  }

  static async getNoteById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const note = await DBStore.findNoteById(req.params.id, studentId);
      if (!note) {
        res.status(404).json({ success: false, message: 'Note not found.' });
        return;
      }
      res.json({ success: true, note });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving note.', error: error.message });
    }
  }

  static async updateNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const noteId = req.params.id;
      const { title, content } = req.body;

      const updated = await DBStore.updateNote(noteId, studentId, {
        ...(title ? { title: title.trim() } : {}),
        ...(content ? { content } : {}),
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Note not found.' });
        return;
      }

      res.json({ success: true, note: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to update note.', error: error.message });
    }
  }

  static async deleteNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const noteId = req.params.id;

      await DBStore.deleteNote(noteId, studentId);
      res.json({ success: true, message: 'Note deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete note.', error: error.message });
    }
  }

  static async deleteAllNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      await DBStore.deleteAllNotes(studentId);
      res.json({ success: true, message: 'All notes deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete notes.', error: error.message });
    }
  }

  static async exportNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const noteId = req.params.id;
      const format = (req.query.format as string)?.toLowerCase() || 'txt';

      const note = await DBStore.findNoteById(noteId, studentId);
      if (!note) {
        res.status(404).json({ success: false, message: 'Note not found.' });
        return;
      }

      const safeFilename = (note.title || 'study_notes').replace(/[^a-zA-Z0-9_-]/g, '_');

      if (format === 'txt') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.txt"`);
        res.send(`EDURAG AI - STUDY NOTES\n============================\nTitle: ${note.title}\nSource: ${note.documentName || 'Document'}\nGenerated: ${new Date(note.createdAt).toLocaleString()}\n\n${note.content}`);
        return;
      }

      if (format === 'docx' || format === 'doc') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.doc"`);
        const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.title}</title><style>body{font-family:Arial,sans-serif;line-height:1.6;margin:40px;color:#222;}h1{color:#1d4ed8;border-bottom:2px solid #e2e8f0;padding-bottom:8px;}pre{background:#f1f5f9;padding:12px;border-radius:6px;}</style></head><body><h1>${note.title}</h1><p><em>Source: ${note.documentName || 'Study Material'} | Generated with EduRAG AI</em></p><hr/><pre style="white-space:pre-wrap;font-family:inherit;">${note.content}</pre></body></html>`;
        res.send(htmlDoc);
        return;
      }

      // PDF format (formatted printable HTML/PDF stream)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.title}</title><style>body{font-family:Arial,sans-serif;line-height:1.6;margin:40px;color:#222;}@media print{button{display:none;}}</style></head><body><button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-bottom:20px;">Print / Save as PDF</button><h1>${note.title}</h1><p><em>Source: ${note.documentName}</em></p><div style="white-space:pre-wrap;">${note.content}</div></body></html>`);
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to export note.', error: error.message });
    }
  }
}
