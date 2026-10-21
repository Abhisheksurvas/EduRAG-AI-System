export interface Student {
  _id: string;
  name: string;
  email: string;
  rollNo?: string;
  branch?: string;
  semester?: string;
  year?: string;
  goals?: string;
  avatar?: string;
  createdAt?: string;
}

export interface DocumentItem {
  _id: string;
  studentId: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  status: 'processing' | 'ready' | 'failed';
  processingProgress: number;
  totalPages: number;
  uploadedAt: string;
  processedAt?: string;
  error?: string;
}

export interface SourceReference {
  documentId?: string;
  filename: string;
  pageNumber: number;
  snippet?: string;
  unit?: string;
  chapter?: string;
}

export interface MessageItem {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  studyMaterialAnswer?: string;
  generalAiAnswer?: string;
  answerMode?: 'study_material' | 'ai_knowledge' | 'dual';
  marks?: number;
  language?: string;
  documentIds?: string[];
  attachedDocumentName?: string;
  attachedDocumentType?: string;
  sources?: SourceReference[];
  createdAt: string;
}

export interface ConversationItem {
  _id: string;
  studentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteItem {
  _id: string;
  studentId: string;
  documentId?: string;
  documentName?: string;
  title: string;
  unit?: string;
  chapter?: string;
  prompt: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuizQuestionItem {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sourcePage?: number;
  selectedAnswer?: number | null;
}

export interface QuizItem {
  _id: string;
  studentId: string;
  documentId?: string;
  documentName?: string;
  title: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  timeLimit?: number;
  questions: QuizQuestionItem[];
  status: 'unattempted' | 'in_progress' | 'completed';
  score?: number;
  totalAnswered?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  _id: string;
  studentId: string;
  type: 'system' | 'quiz' | 'document' | 'notes';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MongoHealthStatus {
  connected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  dbName: string;
  host?: string;
  uriConfigured: boolean;
  error?: string;
}
