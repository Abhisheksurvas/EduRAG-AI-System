import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DBStore } from '../models/store.js';
import { RAGRetriever } from '../rag/retrieval.js';
import { StudyMaterialGenerator } from '../rag/studyMaterialGenerator.js';
import { AiKnowledgeGenerator } from '../rag/aiKnowledgeGenerator.js';

export class ChatController {
  static async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const conversations = await DBStore.findConversationsByStudent(studentId);
      res.json({ success: true, conversations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve conversations.', error: error.message });
    }
  }

  static async createConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const { title } = req.body;
      const conversation = await DBStore.createConversation(studentId, title || 'New Study Conversation');
      res.status(201).json({ success: true, conversation });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to create conversation.', error: error.message });
    }
  }

  static async getConversationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const convId = req.params.id;
      const conversation = await DBStore.findConversationById(convId, studentId);

      if (!conversation) {
        res.status(404).json({ success: false, message: 'Conversation not found.' });
        return;
      }

      const messages = await DBStore.findMessagesByConversation(convId, studentId);
      res.json({ success: true, conversation, messages });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to get conversation.', error: error.message });
    }
  }

  static async updateConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const convId = req.params.id;
      const { title } = req.body;

      if (!title || !title.trim()) {
        res.status(400).json({ success: false, message: 'Title is required.' });
        return;
      }

      const updated = await DBStore.updateConversationTitle(convId, studentId, title.trim());
      if (!updated) {
        res.status(404).json({ success: false, message: 'Conversation not found.' });
        return;
      }

      res.json({ success: true, conversation: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to update conversation.', error: error.message });
    }
  }

  static async deleteConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const convId = req.params.id;
      await DBStore.deleteConversation(convId, studentId);
      res.json({ success: true, message: 'Conversation deleted.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete conversation.', error: error.message });
    }
  }

  /**
   * Main RAG dual-mode chat endpoint with university exam marks (4, 6, 8 marks) & multilingual support
   */
  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      let { conversationId, question, documentId, marks: reqMarks, language } = req.body;

      if (!question || !question.trim()) {
        res.status(400).json({ success: false, message: 'Question content cannot be empty.' });
        return;
      }

      const cleanQuestion = question.trim();
      const targetMarks = [4, 6, 8].includes(Number(reqMarks)) ? Number(reqMarks) : 6;
      const targetLanguage = typeof language === 'string' && language.trim() ? language.trim() : 'English';

      // Ensure conversation exists or create one
      let conversation = null;
      if (conversationId) {
        conversation = await DBStore.findConversationById(conversationId, studentId);
      }

      if (!conversation) {
        const title = cleanQuestion.slice(0, 36) + (cleanQuestion.length > 36 ? '...' : '');
        conversation = await DBStore.createConversation(studentId, title);
        conversationId = conversation._id.toString();
      }

      // Ensure student has study material seeded if they have 0 documents
      let existingDocs = await DBStore.findDocumentsByStudent(studentId);
      if (existingDocs.length === 0) {
        const { SampleDocsService } = await import('../services/sampleDocsService.js');
        await SampleDocsService.seedSampleDocumentsForStudent(studentId);
        existingDocs = await DBStore.findDocumentsByStudent(studentId);
      }

      let attachedDocName: string | undefined = undefined;
      let attachedDocType: string | undefined = undefined;
      let effectiveDocId = documentId;
      if (effectiveDocId) {
        const foundDoc = await DBStore.findDocumentById(effectiveDocId, studentId);
        if (foundDoc) {
          attachedDocName = foundDoc.originalName;
          attachedDocType = foundDoc.fileType;
        }
      } else if (existingDocs.length === 1) {
        effectiveDocId = existingDocs[0]._id.toString();
        attachedDocName = existingDocs[0].originalName;
        attachedDocType = existingDocs[0].fileType;
      }

      // 1. Save user question message
      const userMessage = await DBStore.createMessage({
        studentId,
        conversationId,
        role: 'user',
        content: cleanQuestion,
        documentIds: effectiveDocId ? [effectiveDocId] : [],
        attachedDocumentName: attachedDocName,
        attachedDocumentType: attachedDocType,
        sources: [],
        language: targetLanguage,
      });

      // 2. Perform RAG Retrieval
      const docFilter = effectiveDocId ? [effectiveDocId] : undefined;
      const retrieval = await RAGRetriever.retrieveRelevantChunks(studentId, cleanQuestion, {
        documentIds: docFilter,
        topK: 5,
        minRelevanceThreshold: 0.05,
      });

      // 3 & 4. Concurrently generate SECTION 1 (Study Material Grounded) and SECTION 2 (AI Knowledge Final Answer)
      const [studyMaterialResult, generalAiResult] = await Promise.all([
        StudyMaterialGenerator.generateAnswer(cleanQuestion, retrieval, targetMarks, targetLanguage),
        AiKnowledgeGenerator.generateAnswer(cleanQuestion, targetMarks, targetLanguage),
      ]);

      // 5. Save assistant dual-response message to DB with marks & language
      const assistantMessage = await DBStore.createMessage({
        studentId,
        conversationId,
        role: 'assistant',
        content: cleanQuestion, // prompt ref
        studyMaterialAnswer: studyMaterialResult.answer,
        generalAiAnswer: generalAiResult,
        answerMode: 'dual',
        marks: targetMarks,
        language: targetLanguage,
        documentIds: documentId ? [documentId] : [],
        attachedDocumentName: attachedDocName || (studyMaterialResult.sources?.[0]?.filename),
        attachedDocumentType: attachedDocType,
        sources: studyMaterialResult.sources,
      });

      // If conversation title is default or first message, update with informative title
      const existingMessages = await DBStore.findMessagesByConversation(conversationId, studentId);
      if (existingMessages.length <= 2 && conversation.title === 'New Study Conversation') {
        const title = cleanQuestion.slice(0, 38) + (cleanQuestion.length > 38 ? '...' : '');
        await DBStore.updateConversationTitle(conversationId, studentId, title);
      }

      res.status(201).json({
        success: true,
        conversationId,
        userMessage,
        assistantMessage,
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ success: false, message: 'Failed to process chat message.', error: error.message });
    }
  }

  /**
   * Edit user question and regenerate answer with specified marks & language
   */
  static async editMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const messageId = req.params.id;
      const { newQuestion, documentId, marks: reqMarks, language } = req.body;

      if (!newQuestion || !newQuestion.trim()) {
        res.status(400).json({ success: false, message: 'Question content cannot be empty.' });
        return;
      }

      const existingMsg = await DBStore.findMessageById(messageId, studentId);
      if (!existingMsg || existingMsg.role !== 'user') {
        res.status(404).json({ success: false, message: 'User message not found.' });
        return;
      }

      const conversationId = existingMsg.conversationId.toString();
      const cleanQuestion = newQuestion.trim();
      const targetMarks = [4, 6, 8].includes(Number(reqMarks)) ? Number(reqMarks) : (existingMsg.marks || 6);
      const targetLanguage = typeof language === 'string' && language.trim() ? language.trim() : (existingMsg.language || 'English');

      let attachedDocName = existingMsg.attachedDocumentName;
      let attachedDocType = existingMsg.attachedDocumentType;
      let effectiveDocId = documentId || (existingMsg.documentIds?.[0]?.toString());
      if (effectiveDocId) {
        const foundDoc = await DBStore.findDocumentById(effectiveDocId, studentId);
        if (foundDoc) {
          attachedDocName = foundDoc.originalName;
          attachedDocType = foundDoc.fileType;
        }
      }

      // Update user message
      const updatedUserMsg = await DBStore.updateMessage(messageId, studentId, {
        content: cleanQuestion,
        language: targetLanguage,
        documentIds: effectiveDocId ? [effectiveDocId] : (existingMsg.documentIds || []),
        attachedDocumentName: attachedDocName,
        attachedDocumentType: attachedDocType,
      });

      // Retrieve and Regenerate answer
      const docFilter = effectiveDocId ? [effectiveDocId] : undefined;
      const retrieval = await RAGRetriever.retrieveRelevantChunks(studentId, cleanQuestion, {
        documentIds: docFilter,
        topK: 5,
        minRelevanceThreshold: 0.05,
      });

      // Concurrently generate both sections
      const [studyMaterialResult, generalAiResult] = await Promise.all([
        StudyMaterialGenerator.generateAnswer(cleanQuestion, retrieval, targetMarks, targetLanguage),
        AiKnowledgeGenerator.generateAnswer(cleanQuestion, targetMarks, targetLanguage),
      ]);

      // Find the following assistant message or create one
      const convMessages = await DBStore.findMessagesByConversation(conversationId, studentId);
      const userIndex = convMessages.findIndex((m: any) => String(m._id) === String(messageId));

      let assistantMessage = null;
      if (userIndex !== -1 && userIndex + 1 < convMessages.length && convMessages[userIndex + 1].role === 'assistant') {
        const nextId = convMessages[userIndex + 1]._id.toString();
        assistantMessage = await DBStore.updateMessage(nextId, studentId, {
          content: cleanQuestion,
          studyMaterialAnswer: studyMaterialResult.answer,
          generalAiAnswer: generalAiResult,
          sources: studyMaterialResult.sources,
          marks: targetMarks,
          language: targetLanguage,
        });
      } else {
        assistantMessage = await DBStore.createMessage({
          studentId,
          conversationId,
          role: 'assistant',
          content: cleanQuestion,
          studyMaterialAnswer: studyMaterialResult.answer,
          generalAiAnswer: generalAiResult,
          answerMode: 'dual',
          marks: targetMarks,
          language: targetLanguage,
          documentIds: documentId ? [documentId] : [],
          sources: studyMaterialResult.sources,
        });
      }

      res.json({
        success: true,
        userMessage: updatedUserMsg,
        assistantMessage,
      });
    } catch (error: any) {
      console.error('Edit message error:', error);
      res.status(500).json({ success: false, message: 'Failed to update message.', error: error.message });
    }
  }

  /**
   * Regenerate assistant message answer or switch mark format (4, 6, or 8 marks) & language
   */
  static async regenerateAnswer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const messageId = req.params.id;
      const { marks: requestedMarks, documentId, language: requestedLanguage } = req.body;

      const targetMsg = await DBStore.findMessageById(messageId, studentId);
      if (!targetMsg) {
        res.status(404).json({ success: false, message: 'Message not found.' });
        return;
      }

      let assistantMessageToUpdate: any = null;
      let question = '';

      if (targetMsg.role === 'assistant') {
        assistantMessageToUpdate = targetMsg;
        question = targetMsg.content;
      } else {
        // targetMsg is a user question
        const convMessages = await DBStore.findMessagesByConversation(targetMsg.conversationId.toString(), studentId);
        const idx = convMessages.findIndex((m: any) => String(m._id) === String(messageId));
        if (idx !== -1 && idx + 1 < convMessages.length && convMessages[idx + 1].role === 'assistant') {
          assistantMessageToUpdate = convMessages[idx + 1];
        }
        question = targetMsg.content;
      }

      if (!question || !question.trim()) {
        res.status(400).json({ success: false, message: 'Unable to identify question for regeneration.' });
        return;
      }

      const targetMarks = [4, 6, 8].includes(Number(requestedMarks))
        ? Number(requestedMarks)
        : (assistantMessageToUpdate?.marks || 6);

      const targetLanguage = typeof requestedLanguage === 'string' && requestedLanguage.trim()
        ? requestedLanguage.trim()
        : (assistantMessageToUpdate?.language || 'English');

      const docId = documentId || (assistantMessageToUpdate?.documentIds?.[0]?.toString());
      const docFilter = docId ? [docId] : undefined;

      const retrieval = await RAGRetriever.retrieveRelevantChunks(studentId, question, {
        documentIds: docFilter,
        topK: 5,
        minRelevanceThreshold: 0.05,
      });

      // Concurrently regenerate both sections
      const [studyMaterialResult, generalAiResult] = await Promise.all([
        StudyMaterialGenerator.generateAnswer(question, retrieval, targetMarks, targetLanguage),
        AiKnowledgeGenerator.generateAnswer(question, targetMarks, targetLanguage),
      ]);

      if (assistantMessageToUpdate) {
        const updated = await DBStore.updateMessage(assistantMessageToUpdate._id.toString(), studentId, {
          studyMaterialAnswer: studyMaterialResult.answer,
          generalAiAnswer: generalAiResult,
          sources: studyMaterialResult.sources,
          marks: targetMarks,
          language: targetLanguage,
        });

        res.json({
          success: true,
          assistantMessage: updated,
        });
      } else {
        const newAssistantMsg = await DBStore.createMessage({
          studentId,
          conversationId: targetMsg.conversationId,
          role: 'assistant',
          content: question,
          studyMaterialAnswer: studyMaterialResult.answer,
          generalAiAnswer: generalAiResult,
          answerMode: 'dual',
          marks: targetMarks,
          language: targetLanguage,
          documentIds: docId ? [docId] : [],
          sources: studyMaterialResult.sources,
        });

        res.json({
          success: true,
          assistantMessage: newAssistantMsg,
        });
      }
    } catch (error: any) {
      console.error('Regenerate answer error:', error);
      res.status(500).json({ success: false, message: 'Failed to regenerate answer.', error: error.message });
    }
  }
}
