import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-based index or option string
  explanation: string;
  sourcePage?: number;
  selectedAnswer?: number | null;
}

export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  documentId?: mongoose.Types.ObjectId;
  documentName?: string;
  title: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  timeLimit?: number; // in minutes
  questions: IQuizQuestion[];
  status: 'unattempted' | 'in_progress' | 'completed';
  score?: number;
  totalAnswered?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema(
  {
    questionNumber: { type: Number, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true },
    explanation: { type: String, required: true },
    sourcePage: { type: Number },
    selectedAnswer: { type: Number, default: null },
  },
  { _id: false }
);

const QuizSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    documentName: { type: String },
    title: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    questionCount: { type: Number, required: true },
    timeLimit: { type: Number, default: 10 },
    questions: [QuizQuestionSchema],
    status: { type: String, enum: ['unattempted', 'in_progress', 'completed'], default: 'unattempted' },
    score: { type: Number, default: 0 },
    totalAnswered: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const QuizModel = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema, 'quizzes');
