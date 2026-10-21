import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentChunk extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  filename: string;
  pageNumber: number;
  unit?: string;
  chapter?: string;
  chunkIndex: number;
  text: string;
  embedding?: number[];
  createdAt: Date;
}

const DocumentChunkSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    filename: { type: String, required: true },
    pageNumber: { type: Number, required: true, default: 1 },
    unit: { type: String, default: '' },
    chapter: { type: String, default: '' },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Compound index for student document queries
DocumentChunkSchema.index({ studentId: 1, documentId: 1, chunkIndex: 1 });

export const DocumentChunkModel =
  mongoose.models.DocumentChunk ||
  mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema, 'document_chunks');
