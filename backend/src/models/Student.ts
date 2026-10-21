import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  rollNo?: string;
  branch?: string;
  semester?: string;
  year?: string;
  goals?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    rollNo: { type: String, default: '' },
    branch: { type: String, default: 'Computer Science & Engineering' },
    semester: { type: String, default: 'VIII' },
    year: { type: String, default: 'Final Year' },
    goals: { type: String, default: 'Prepare for semester exams and master RAG architectures.' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

export const StudentModel = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema, 'students');
