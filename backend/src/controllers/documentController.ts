import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DBStore } from '../models/store.js';
import { DocumentExtractor } from '../rag/extractor.js';
import { DocumentChunker } from '../rag/chunker.js';
import { EmbeddingService } from '../rag/embedding.js';

export class DocumentController {
  static async uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const file = req.file;

      if (!file) {
        res.status(400).json({ success: false, message: 'No document file uploaded.' });
        return;
      }

      // 1. Check max documents limit (10 documents per student)
      const currentDocCount = await DBStore.countTotalDocuments(studentId);
      if (currentDocCount >= 10) {
        res.status(400).json({
          success: false,
          message: 'Document limit reached. Maximum 10 documents allowed per student account. Delete an old document to upload new ones.',
        });
        return;
      }

      // 2. Validate file type
      const allowedExts = ['pdf', 'docx', 'pptx', 'txt'];
      const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
      if (!allowedExts.includes(ext)) {
        res.status(400).json({
          success: false,
          message: `Unsupported file format (.${ext}). Allowed formats: PDF, DOCX, PPTX, TXT.`,
        });
        return;
      }

      // 3. Compute hash
      const hash = crypto.createHash('md5').update(file.buffer).digest('hex');

      // 4. Save initial document metadata with status = 'processing'
      const doc = await DBStore.createDocument({
        studentId,
        filename: `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`,
        originalName: file.originalname,
        fileType: ext.toUpperCase(),
        fileSize: file.size,
        status: 'processing',
        processingProgress: 10,
        totalPages: 1,
        hash,
      });

      // Send immediate response back to client with processing status
      res.status(202).json({
        success: true,
        message: 'Document uploaded successfully. Processing and vectorization in progress.',
        document: doc,
      });

      // 5. Asynchronous RAG processing pipeline (Text Extraction -> Chunking -> Vector Embedding -> Ready)
      (async () => {
        try {
          // Extraction
          const extraction = await DocumentExtractor.extract(file.buffer, file.originalname, file.mimetype);
          await DBStore.updateDocument(doc._id.toString(), studentId, {
            totalPages: extraction.totalPages,
            processingProgress: 40,
          });

          // Chunking
          const chunks = DocumentChunker.chunkDocument(extraction.pages, {
            studentId,
            documentId: doc._id.toString(),
            filename: file.originalname,
          });

          await DBStore.updateDocument(doc._id.toString(), studentId, {
            processingProgress: 60,
          });

          // Embeddings
          const texts = chunks.map((c) => c.text);
          const embeddings = await EmbeddingService.generateBatchEmbeddings(texts);

          const chunksWithEmbeddings = chunks.map((c, idx) => ({
            ...c,
            embedding: embeddings[idx] || [],
          }));

          // Store chunks in DB
          await DBStore.insertChunks(chunksWithEmbeddings);

          // Mark status = 'ready'
          await DBStore.updateDocument(doc._id.toString(), studentId, {
            status: 'ready',
            processingProgress: 100,
            processedAt: new Date().toISOString(),
          });

          // Create notification
          await DBStore.createNotification({
            studentId,
            type: 'document',
            title: 'Document Ready',
            message: `"${file.originalname}" (${extraction.totalPages} pages, ${chunks.length} chunks) is processed and ready for RAG study.`,
            read: false,
          });
        } catch (procErr: any) {
          console.error(`Document processing failed for ${file.originalname}:`, procErr);
          await DBStore.updateDocument(doc._id.toString(), studentId, {
            status: 'failed',
            processingProgress: 0,
            error: procErr.message || 'Text extraction or vector indexing failed.',
          });

          await DBStore.createNotification({
            studentId,
            type: 'document',
            title: 'Document Processing Failed',
            message: `Processing for "${file.originalname}" failed: ${procErr.message}`,
            read: false,
          });
        }
      })();
    } catch (error: any) {
      console.error('Upload document error:', error);
      res.status(500).json({ success: false, message: 'Document upload failed.', error: error.message });
    }
  }

  static async getDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const docs = await DBStore.findDocumentsByStudent(studentId);
      res.json({ success: true, documents: docs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve documents.', error: error.message });
    }
  }

  static async getDocumentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const doc = await DBStore.findDocumentById(req.params.id, studentId);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Document not found.' });
        return;
      }
      res.json({ success: true, document: doc });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error fetching document.', error: error.message });
    }
  }

  static async getDocumentChunks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const docId = req.params.id;
      const doc = await DBStore.findDocumentById(docId, studentId);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Document not found.' });
        return;
      }
      const chunks = await DBStore.findChunks(studentId, [docId]);
      res.json({
        success: true,
        document: doc,
        chunks: chunks.map((c: any) => ({
          _id: c._id,
          pageNumber: c.pageNumber || 1,
          chunkIndex: c.chunkIndex || 0,
          unit: c.unit || '',
          chapter: c.chapter || '',
          text: c.text || '',
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve document chunks.', error: error.message });
    }
  }

  static async deleteDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const docId = req.params.id;
      const doc = await DBStore.findDocumentById(docId, studentId);

      if (!doc) {
        res.status(404).json({ success: false, message: 'Document not found.' });
        return;
      }

      await DBStore.deleteDocument(docId, studentId);

      await DBStore.createNotification({
        studentId,
        type: 'system',
        title: 'Document Deleted',
        message: `"${doc.originalName}" and all associated vector chunks were deleted.`,
        read: false,
      });

      res.json({ success: true, message: 'Document deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete document.', error: error.message });
    }
  }

  static async deleteAllDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      await DBStore.deleteAllDocuments(studentId);

      await DBStore.createNotification({
        studentId,
        type: 'system',
        title: 'All Documents Cleared',
        message: 'All uploaded study materials and vector chunks have been cleared.',
        read: false,
      });

      res.json({ success: true, message: 'All documents deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to clear documents.', error: error.message });
    }
  }

  static async seedSample(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const { SampleDocsService } = await import('../services/sampleDocsService.js');
      const doc = await SampleDocsService.seedSampleDocumentsForStudent(studentId);
      const docs = await DBStore.findDocumentsByStudent(studentId);
      res.json({
        success: true,
        message: 'Sample CS802 ML & NLP study material loaded successfully.',
        document: doc,
        documents: docs,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to seed sample documents.', error: error.message });
    }
  }
}
