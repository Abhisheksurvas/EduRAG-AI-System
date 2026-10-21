import mongoose, { Schema, Document } from 'mongoose';

export interface ISourceRef {
  documentId?: string;
  filename: string;
  pageNumber: number;
  snippet?: string;
  unit?: string;
  chapter?: string;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  // Two sections if assistant: studyMaterialAnswer and generalAiAnswer, or unified content with answerMode
  studyMaterialAnswer?: string;
  generalAiAnswer?: string;
  answerMode?: 'study_material' | 'ai_knowledge' | 'dual';
  marks?: number;
  language?: string;
  documentIds: mongoose.Types.ObjectId[];
  attachedDocumentName?: string;
  attachedDocumentType?: string;
  sources: ISourceRef[];
  createdAt: Date;
}

const SourceRefSchema = new Schema(
  {
    documentId: { type: String },
    filename: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    snippet: { type: String },
    unit: { type: String },
    chapter: { type: String },
  },
  { _id: false }
);

const MessageSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    studyMaterialAnswer: { type: String },
    generalAiAnswer: { type: String },
    answerMode: { type: String, enum: ['study_material', 'ai_knowledge', 'dual'], default: 'dual' },
    marks: { type: Number, enum: [4, 6, 8], default: 6 },
    language: { type: String, default: 'English' },
    documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    attachedDocumentName: { type: String },
    attachedDocumentType: { type: String },
    sources: [SourceRefSchema],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const MessageModel =
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema, 'messages');
