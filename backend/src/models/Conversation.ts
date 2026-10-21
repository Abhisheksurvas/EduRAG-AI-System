import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    title: { type: String, required: true, default: 'New Study Conversation' },
  },
  { timestamps: true }
);

export const ConversationModel =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', ConversationSchema, 'conversations');
