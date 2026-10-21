import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  documentId?: mongoose.Types.ObjectId;
  documentName?: string;
  title: string;
  unit?: string;
  chapter?: string;
  prompt: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    documentName: { type: String },
    title: { type: String, required: true },
    unit: { type: String, default: '' },
    chapter: { type: String, default: '' },
    prompt: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const NoteModel = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema, 'notes');
