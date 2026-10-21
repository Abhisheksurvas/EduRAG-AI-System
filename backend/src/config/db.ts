import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export interface MongoStatus {
  connected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  uriConfigured: boolean;
  dbName: string;
  host?: string;
  error?: string;
  lastChecked: string;
}

let currentStatus: MongoStatus = {
  connected: false,
  status: 'disconnected',
  uriConfigured: false,
  dbName: process.env.MONGODB_DB_NAME || 'EduRAG_AI_DB',
  lastChecked: new Date().toISOString(),
};

export const getMongoStatus = (): MongoStatus => {
  const state = mongoose.connection.readyState;
  currentStatus.connected = state === 1;
  currentStatus.status = state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected';
  if (state === 1 && mongoose.connection.host) {
    currentStatus.host = mongoose.connection.host;
  }
  currentStatus.lastChecked = new Date().toISOString();
  return currentStatus;
};

export const connectMongoDB = async (customUri?: string): Promise<boolean> => {
  const uri = customUri || process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'EduRAG_AI_DB';

  if (!uri) {
    currentStatus.uriConfigured = false;
    currentStatus.status = 'disconnected';
    currentStatus.error = 'MONGODB_URI not provided in environment variables or secrets.';
    console.warn('⚠️ [MongoDB Atlas] MONGODB_URI not found. Please provide your Atlas connection string in .env or via Developer Panel.');
    return false;
  }

  currentStatus.uriConfigured = true;
  currentStatus.status = 'connecting';
  currentStatus.dbName = dbName;

  try {
    // If already connected, disconnect first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoose.connection.on('connected', () => {
      console.log('✅ [MongoDB Atlas] Connected successfully to:', mongoose.connection.host);
      currentStatus.connected = true;
      currentStatus.status = 'connected';
      currentStatus.host = mongoose.connection.host;
      currentStatus.error = undefined;
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ [MongoDB Atlas] Connection error:', err.message);
      currentStatus.connected = false;
      currentStatus.status = 'error';
      currentStatus.error = err.message;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [MongoDB Atlas] Disconnected from database.');
      currentStatus.connected = false;
      currentStatus.status = 'disconnected';
    });

    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 5000,
    });

    currentStatus.connected = true;
    currentStatus.status = 'connected';
    currentStatus.host = mongoose.connection.host;
    currentStatus.error = undefined;
    return true;
  } catch (error: any) {
    console.error('❌ [MongoDB Atlas] Failed to connect:', error.message);
    currentStatus.connected = false;
    currentStatus.status = 'error';
    currentStatus.error = error.message;
    return false;
  }
};
