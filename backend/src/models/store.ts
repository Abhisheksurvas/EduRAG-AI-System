import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { StudentModel } from './Student.js';
import { DocumentModel } from './Document.js';
import { DocumentChunkModel } from './DocumentChunk.js';
import { ConversationModel } from './Conversation.js';
import { MessageModel } from './Message.js';
import { NoteModel } from './Note.js';
import { QuizModel } from './Quiz.js';
import { NotificationModel } from './Notification.js';

// Local storage path for offline/development fallback when Atlas is not yet connected
const DATA_DIR = path.resolve(process.cwd(), '.edurag_data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

interface MemoryStore {
  students: any[];
  documents: any[];
  document_chunks: any[];
  conversations: any[];
  messages: any[];
  notes: any[];
  quizzes: any[];
  notifications: any[];
}

let memoryData: MemoryStore = {
  students: [],
  documents: [],
  document_chunks: [],
  conversations: [],
  messages: [],
  notes: [],
  quizzes: [],
  notifications: [],
};

// Ensure data folder and load cached data
const initFilePersistence = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryData = {
        students: parsed.students || [],
        documents: parsed.documents || [],
        document_chunks: parsed.document_chunks || [],
        conversations: parsed.conversations || [],
        messages: parsed.messages || [],
        notes: parsed.notes || [],
        quizzes: parsed.quizzes || [],
        notifications: parsed.notifications || [],
      };
    }
  } catch (err) {
    console.warn('Fallback store persistence initialization note:', err);
  }
};

const saveFilePersistence = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save fallback store:', err);
  }
};

const syncFromFile = () => {
  initFilePersistence();
};

initFilePersistence();

const isMongooseConnected = () => mongoose.connection.readyState === 1;

export const DBStore = {
  // STUDENTS
  async findStudentByEmail(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    if (isMongooseConnected()) {
      return await StudentModel.findOne({ email: cleanEmail }).lean();
    }
    syncFromFile();
    return memoryData.students.find((s) => s.email.toLowerCase() === cleanEmail) || null;
  },

  async findStudentById(id: string) {
    if (isMongooseConnected()) {
      return await StudentModel.findById(id).lean();
    }
    syncFromFile();
    return memoryData.students.find((s) => String(s._id) === String(id)) || null;
  },

  async findAllStudents() {
    if (isMongooseConnected()) {
      return await StudentModel.find().lean();
    }
    syncFromFile();
    return memoryData.students || [];
  },

  async createStudent(studentData: any) {
    if (isMongooseConnected()) {
      const doc = await StudentModel.create(studentData);
      return doc.toObject();
    }
    const student = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...studentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryData.students.push(student);
    saveFilePersistence();
    return student;
  },

  async updateStudent(id: string, updates: any) {
    if (isMongooseConnected()) {
      return await StudentModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    }
    const index = memoryData.students.findIndex((s) => String(s._id) === String(id));
    if (index === -1) return null;
    memoryData.students[index] = {
      ...memoryData.students[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveFilePersistence();
    return memoryData.students[index];
  },

  // DOCUMENTS
  async findDocumentsByStudent(studentId: string) {
    if (isMongooseConnected()) {
      return await DocumentModel.find({ studentId }).sort({ uploadedAt: -1 }).lean();
    }
    return memoryData.documents
      .filter((d) => String(d.studentId) === String(studentId))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  },

  async findDocumentById(id: string, studentId: string) {
    if (isMongooseConnected()) {
      return await DocumentModel.findOne({ _id: id, studentId }).lean();
    }
    return (
      memoryData.documents.find(
        (d) => String(d._id) === String(id) && String(d.studentId) === String(studentId)
      ) || null
    );
  },

  async countReadyDocuments(studentId: string) {
    if (isMongooseConnected()) {
      return await DocumentModel.countDocuments({ studentId, status: 'ready' });
    }
    return memoryData.documents.filter(
      (d) => String(d.studentId) === String(studentId) && d.status === 'ready'
    ).length;
  },

  async countTotalDocuments(studentId: string) {
    if (isMongooseConnected()) {
      return await DocumentModel.countDocuments({ studentId });
    }
    return memoryData.documents.filter((d) => String(d.studentId) === String(studentId)).length;
  },

  async createDocument(docData: any) {
    if (isMongooseConnected()) {
      const doc = await DocumentModel.create(docData);
      return doc.toObject();
    }
    const doc = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...docData,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryData.documents.push(doc);
    saveFilePersistence();
    return doc;
  },

  async updateDocument(id: string, studentId: string, updates: any) {
    if (isMongooseConnected()) {
      return await DocumentModel.findOneAndUpdate({ _id: id, studentId }, updates, { new: true }).lean();
    }
    const index = memoryData.documents.findIndex(
      (d) => String(d._id) === String(id) && String(d.studentId) === String(studentId)
    );
    if (index === -1) return null;
    memoryData.documents[index] = {
      ...memoryData.documents[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveFilePersistence();
    return memoryData.documents[index];
  },

  async deleteDocument(id: string, studentId: string) {
    if (isMongooseConnected()) {
      await DocumentModel.deleteOne({ _id: id, studentId });
      await DocumentChunkModel.deleteMany({ documentId: id, studentId });
      return true;
    }
    memoryData.documents = memoryData.documents.filter(
      (d) => !(String(d._id) === String(id) && String(d.studentId) === String(studentId))
    );
    memoryData.document_chunks = memoryData.document_chunks.filter(
      (c) => !(String(c.documentId) === String(id) && String(c.studentId) === String(studentId))
    );
    saveFilePersistence();
    return true;
  },

  async deleteAllDocuments(studentId: string) {
    if (isMongooseConnected()) {
      await DocumentModel.deleteMany({ studentId });
      await DocumentChunkModel.deleteMany({ studentId });
      return true;
    }
    memoryData.documents = memoryData.documents.filter((d) => String(d.studentId) !== String(studentId));
    memoryData.document_chunks = memoryData.document_chunks.filter(
      (c) => String(c.studentId) !== String(studentId)
    );
    saveFilePersistence();
    return true;
  },

  // DOCUMENT CHUNKS
  async insertChunks(chunks: any[]) {
    if (chunks.length === 0) return [];
    if (isMongooseConnected()) {
      return await DocumentChunkModel.insertMany(chunks);
    }
    const storedChunks = chunks.map((c) => ({
      _id: new mongoose.Types.ObjectId().toString(),
      ...c,
      createdAt: new Date().toISOString(),
    }));
    memoryData.document_chunks.push(...storedChunks);
    saveFilePersistence();
    return storedChunks;
  },

  async findChunks(studentId: string, documentIds?: string[]) {
    if (isMongooseConnected()) {
      const query: any = { studentId };
      if (documentIds && documentIds.length > 0) {
        query.documentId = { $in: documentIds };
      }
      return await DocumentChunkModel.find(query).lean();
    }
    return memoryData.document_chunks.filter((c) => {
      const matchStudent = String(c.studentId) === String(studentId);
      if (!matchStudent) return false;
      if (documentIds && documentIds.length > 0) {
        return documentIds.map(String).includes(String(c.documentId));
      }
      return true;
    });
  },

  // CONVERSATIONS
  async findConversationsByStudent(studentId: string) {
    if (isMongooseConnected()) {
      return await ConversationModel.find({ studentId }).sort({ updatedAt: -1 }).lean();
    }
    return memoryData.conversations
      .filter((c) => String(c.studentId) === String(studentId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async findConversationById(id: string, studentId: string) {
    if (isMongooseConnected()) {
      return await ConversationModel.findOne({ _id: id, studentId }).lean();
    }
    return (
      memoryData.conversations.find(
        (c) => String(c._id) === String(id) && String(c.studentId) === String(studentId)
      ) || null
    );
  },

  async createConversation(studentId: string, title: string = 'New Study Conversation') {
    if (isMongooseConnected()) {
      const doc = await ConversationModel.create({ studentId, title });
      return doc.toObject();
    }
    const conv = {
      _id: new mongoose.Types.ObjectId().toString(),
      studentId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryData.conversations.push(conv);
    saveFilePersistence();
    return conv;
  },

  async updateConversationTitle(id: string, studentId: string, title: string) {
    if (isMongooseConnected()) {
      return await ConversationModel.findOneAndUpdate(
        { _id: id, studentId },
        { title, updatedAt: new Date() },
        { new: true }
      ).lean();
    }
    const conv = memoryData.conversations.find(
      (c) => String(c._id) === String(id) && String(c.studentId) === String(studentId)
    );
    if (!conv) return null;
    conv.title = title;
    conv.updatedAt = new Date().toISOString();
    saveFilePersistence();
    return conv;
  },

  async deleteConversation(id: string, studentId: string) {
    if (isMongooseConnected()) {
      await ConversationModel.deleteOne({ _id: id, studentId });
      await MessageModel.deleteMany({ conversationId: id, studentId });
      return true;
    }
    memoryData.conversations = memoryData.conversations.filter(
      (c) => !(String(c._id) === String(id) && String(c.studentId) === String(studentId))
    );
    memoryData.messages = memoryData.messages.filter(
      (m) => !(String(m.conversationId) === String(id) && String(m.studentId) === String(studentId))
    );
    saveFilePersistence();
    return true;
  },

  // MESSAGES
  async findMessagesByConversation(conversationId: string, studentId: string) {
    if (isMongooseConnected()) {
      return await MessageModel.find({ conversationId, studentId }).sort({ createdAt: 1 }).lean();
    }
    return memoryData.messages
      .filter(
        (m) =>
          String(m.conversationId) === String(conversationId) &&
          String(m.studentId) === String(studentId)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async findMessageById(id: string, studentId: string) {
    if (isMongooseConnected()) {
      return await MessageModel.findOne({ _id: id, studentId }).lean();
    }
    return (
      memoryData.messages.find(
        (m) => String(m._id) === String(id) && String(m.studentId) === String(studentId)
      ) || null
    );
  },

  async createMessage(msgData: any) {
    if (isMongooseConnected()) {
      const doc = await MessageModel.create(msgData);
      // touch conversation updatedAt
      await ConversationModel.findByIdAndUpdate(msgData.conversationId, { updatedAt: new Date() });
      return doc.toObject();
    }
    const msg = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...msgData,
      createdAt: new Date().toISOString(),
    };
    memoryData.messages.push(msg);
    const conv = memoryData.conversations.find((c) => String(c._id) === String(msgData.conversationId));
    if (conv) conv.updatedAt = new Date().toISOString();
    saveFilePersistence();
    return msg;
  },

  async updateMessage(id: string, studentId: string, updates: any) {
    if (isMongooseConnected()) {
      return await MessageModel.findOneAndUpdate({ _id: id, studentId }, updates, { new: true }).lean();
    }
    const idx = memoryData.messages.findIndex(
      (m) => String(m._id) === String(id) && String(m.studentId) === String(studentId)
    );
    if (idx === -1) return null;
    memoryData.messages[idx] = { ...memoryData.messages[idx], ...updates };
    saveFilePersistence();
    return memoryData.messages[idx];
  },

  // NOTES
  async findNotesByStudent(studentId: string) {
    if (isMongooseConnected()) {
      return await NoteModel.find({ studentId }).sort({ createdAt: -1 }).lean();
    }
    return memoryData.notes
      .filter((n) => String(n.studentId) === String(studentId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async findNoteById(id: string, studentId: string) {
    if (isMongooseConnected()) {
      return await NoteModel.findOne({ _id: id, studentId }).lean();
    }
    return (
      memoryData.notes.find(
        (n) => String(n._id) === String(id) && String(n.studentId) === String(studentId)
      ) || null
    );
  },

  async countNotes(studentId: string) {
    if (isMongooseConnected()) {
      return await NoteModel.countDocuments({ studentId });
    }
    return memoryData.notes.filter((n) => String(n.studentId) === String(studentId)).length;
  },

  async createNote(noteData: any) {
    if (isMongooseConnected()) {
      const doc = await NoteModel.create(noteData);
      return doc.toObject();
    }
    const note = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...noteData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryData.notes.push(note);
    saveFilePersistence();
    return note;
  },

  async updateNote(id: string, studentId: string, updates: any) {
    if (isMongooseConnected()) {
      return await NoteModel.findOneAndUpdate({ _id: id, studentId }, updates, { new: true }).lean();
    }
    const idx = memoryData.notes.findIndex(
      (n) => String(n._id) === String(id) && String(n.studentId) === String(studentId)
    );
    if (idx === -1) return null;
    memoryData.notes[idx] = { ...memoryData.notes[idx], ...updates, updatedAt: new Date().toISOString() };
    saveFilePersistence();
    return memoryData.notes[idx];
  },

  async deleteNote(id: string, studentId: string) {
    if (isMongooseConnected()) {
      await NoteModel.deleteOne({ _id: id, studentId });
      return true;
    }
    memoryData.notes = memoryData.notes.filter(
      (n) => !(String(n._id) === String(id) && String(n.studentId) === String(studentId))
    );
    saveFilePersistence();
    return true;
  },

  async deleteAllNotes(studentId: string) {
    if (isMongooseConnected()) {
      await NoteModel.deleteMany({ studentId });
      return true;
    }
    memoryData.notes = memoryData.notes.filter(
      (n) => String(n.studentId) !== String(studentId)
    );
    saveFilePersistence();
    return true;
  },

  // QUIZZES
  async findQuizzesByStudent(studentId: string) {
    if (isMongooseConnected()) {
      return await QuizModel.find({ studentId }).sort({ createdAt: -1 }).lean();
    }
    return memoryData.quizzes
      .filter((q) => String(q.studentId) === String(studentId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async findQuizById(id: string, studentId: string) {
    if (isMongooseConnected()) {
      return await QuizModel.findOne({ _id: id, studentId }).lean();
    }
    return (
      memoryData.quizzes.find(
        (q) => String(q._id) === String(id) && String(q.studentId) === String(studentId)
      ) || null
    );
  },

  async countQuizzes(studentId: string) {
    if (isMongooseConnected()) {
      return await QuizModel.countDocuments({ studentId });
    }
    return memoryData.quizzes.filter((q) => String(q.studentId) === String(studentId)).length;
  },

  async createQuiz(quizData: any) {
    if (isMongooseConnected()) {
      const doc = await QuizModel.create(quizData);
      return doc.toObject();
    }
    const quiz = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...quizData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryData.quizzes.push(quiz);
    saveFilePersistence();
    return quiz;
  },

  async updateQuiz(id: string, studentId: string, updates: any) {
    if (isMongooseConnected()) {
      return await QuizModel.findOneAndUpdate({ _id: id, studentId }, updates, { new: true }).lean();
    }
    const idx = memoryData.quizzes.findIndex(
      (q) => String(q._id) === String(id) && String(q.studentId) === String(studentId)
    );
    if (idx === -1) return null;
    memoryData.quizzes[idx] = { ...memoryData.quizzes[idx], ...updates, updatedAt: new Date().toISOString() };
    saveFilePersistence();
    return memoryData.quizzes[idx];
  },

  async deleteQuiz(id: string, studentId: string) {
    if (isMongooseConnected()) {
      await QuizModel.deleteOne({ _id: id, studentId });
      return true;
    }
    memoryData.quizzes = memoryData.quizzes.filter(
      (q) => !(String(q._id) === String(id) && String(q.studentId) === String(studentId))
    );
    saveFilePersistence();
    return true;
  },

  // NOTIFICATIONS
  async findNotificationsByStudent(studentId: string) {
    if (isMongooseConnected()) {
      return await NotificationModel.find({ studentId }).sort({ createdAt: -1 }).lean();
    }
    return memoryData.notifications
      .filter((n) => String(n.studentId) === String(studentId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async countUnreadNotifications(studentId: string) {
    if (isMongooseConnected()) {
      return await NotificationModel.countDocuments({ studentId, read: false });
    }
    return memoryData.notifications.filter(
      (n) => String(n.studentId) === String(studentId) && !n.read
    ).length;
  },

  async createNotification(notifData: any) {
    if (isMongooseConnected()) {
      const doc = await NotificationModel.create(notifData);
      return doc.toObject();
    }
    const notif = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...notifData,
      createdAt: new Date().toISOString(),
    };
    memoryData.notifications.push(notif);
    saveFilePersistence();
    return notif;
  },

  async markNotificationRead(id: string, studentId: string) {
    if (isMongooseConnected()) {
      return await NotificationModel.findOneAndUpdate({ _id: id, studentId }, { read: true }, { new: true }).lean();
    }
    const notif = memoryData.notifications.find(
      (n) => String(n._id) === String(id) && String(n.studentId) === String(studentId)
    );
    if (!notif) return null;
    notif.read = true;
    saveFilePersistence();
    return notif;
  },

  async markAllNotificationsRead(studentId: string) {
    if (isMongooseConnected()) {
      await NotificationModel.updateMany({ studentId, read: false }, { read: true });
      return true;
    }
    memoryData.notifications.forEach((n) => {
      if (String(n.studentId) === String(studentId)) n.read = true;
    });
    saveFilePersistence();
    return true;
  },

  async deleteNotification(id: string, studentId: string) {
    if (isMongooseConnected()) {
      await NotificationModel.deleteOne({ _id: id, studentId });
      return true;
    }
    memoryData.notifications = memoryData.notifications.filter(
      (n) => !(String(n._id) === String(id) && String(n.studentId) === String(studentId))
    );
    saveFilePersistence();
    return true;
  },

  async deleteAllNotifications(studentId: string) {
    if (isMongooseConnected()) {
      await NotificationModel.deleteMany({ studentId });
      return true;
    }
    memoryData.notifications = memoryData.notifications.filter(
      (n) => String(n.studentId) !== String(studentId)
    );
    saveFilePersistence();
    return true;
  },

  // GLOBAL SEARCH (Isolated to student)
  async globalSearch(studentId: string, query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return { documents: [], conversations: [], notes: [], quizzes: [] };

    const docs = (await this.findDocumentsByStudent(studentId)).filter((d: any) =>
      d.originalName?.toLowerCase().includes(q) || d.filename?.toLowerCase().includes(q)
    );

    const convs = (await this.findConversationsByStudent(studentId)).filter((c: any) =>
      c.title?.toLowerCase().includes(q)
    );

    const notes = (await this.findNotesByStudent(studentId)).filter(
      (n: any) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.chapter?.toLowerCase().includes(q)
    );

    const quizzes = (await this.findQuizzesByStudent(studentId)).filter(
      (qz: any) => qz.title?.toLowerCase().includes(q) || qz.topic?.toLowerCase().includes(q)
    );

    return { documents: docs, conversations: convs, notes, quizzes };
  },
};
