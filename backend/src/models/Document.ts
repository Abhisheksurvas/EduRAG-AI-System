import mongoose, { Schema, Document } from 'mongoose';

export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface IDocument extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  processingProgress: number;
  totalPages: number;
  uploadedAt: Date;
  processedAt?: Date;
  error?: string;
  hash?: string;
}

const DocumentSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
      index: true,
    },
    processingProgress: { type: Number, default: 0 },
    totalPages: { type: Number, default: 1 },
    uploadedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    error: { type: String },
    hash: { type: String },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema, 'documents');
