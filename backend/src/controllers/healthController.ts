import { Request, Response } from 'express';
import { getMongoStatus, connectMongoDB } from '../config/db.js';
import { isGeminiConfigured } from '../services/gemini.js';

export class HealthController {
  static async check(req: Request, res: Response): Promise<void> {
    const mongo = getMongoStatus();
    const gemini = isGeminiConfigured();

    res.json({
      status: 'ok',
      server: 'running',
      timestamp: new Date().toISOString(),
      database: {
        connected: mongo.connected,
        status: mongo.status,
        dbName: mongo.dbName,
        host: mongo.host || 'Atlas / Local',
        uriConfigured: mongo.uriConfigured,
        error: mongo.error,
      },
      ai: {
        geminiConfigured: gemini,
        model: 'gemini-3.8-flash',
        embeddingModel: 'gemini-embedding-2-preview',
      },
      environment: process.env.NODE_ENV || 'development',
    });
  }

  static async connectMongo(req: Request, res: Response): Promise<void> {
    try {
      const { mongoUri, dbName } = req.body;
      if (!mongoUri || !mongoUri.trim()) {
        res.status(400).json({ success: false, message: 'MONGODB_URI is required.' });
        return;
      }

      if (dbName) {
        process.env.MONGODB_DB_NAME = dbName.trim();
      }

      const connected = await connectMongoDB(mongoUri.trim());
      const status = getMongoStatus();

      if (connected) {
        res.json({
          success: true,
          message: 'Successfully connected to MongoDB Atlas!',
          status,
        });
      } else {
        res.status(400).json({
          success: false,
          message: status.error || 'Failed to connect to MongoDB Atlas.',
          status,
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
