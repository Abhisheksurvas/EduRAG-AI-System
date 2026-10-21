import './backend/src/utils/polyfills.js';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectMongoDB, getMongoStatus } from './backend/src/config/db.js';
import { SampleDocsService } from './backend/src/services/sampleDocsService.js';

// Route imports
import authRoutes from './backend/src/routes/authRoutes.js';
import dashboardRoutes from './backend/src/routes/dashboardRoutes.js';
import documentRoutes from './backend/src/routes/documentRoutes.js';
import chatRoutes from './backend/src/routes/chatRoutes.js';
import notesRoutes from './backend/src/routes/notesRoutes.js';
import quizRoutes from './backend/src/routes/quizRoutes.js';
import notificationRoutes from './backend/src/routes/notificationRoutes.js';
import profileRoutes from './backend/src/routes/profileRoutes.js';
import searchRoutes from './backend/src/routes/searchRoutes.js';
import healthRoutes from './backend/src/routes/healthRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Initialize MongoDB Atlas connection
  await connectMongoDB();

  // Ensure default ML & NLP course notes are seeded for all students
  SampleDocsService.seedAllExistingStudents().catch((err) =>
    console.error('[Startup] Failed to seed sample docs:', err)
  );

  // Middleware
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/quiz', quizRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/search', searchRoutes);

  // Friendly API 404 handler
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `API endpoint '${req.originalUrl}' not found.`,
    });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'An unexpected internal server error occurred.',
    });
  });

  // Frontend integration: Vite in dev, static dist in production
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [EduRAG AI] Server running on http://0.0.0.0:${PORT}`);
    const mongo = getMongoStatus();
    console.log(`📊 [Database Status] Mongo connected: ${mongo.connected} (${mongo.status})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EduRAG AI server:', err);
  process.exit(1);
});
