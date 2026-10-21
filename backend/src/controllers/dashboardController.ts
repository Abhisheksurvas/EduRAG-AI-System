import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DBStore } from '../models/store.js';

export class DashboardController {
  static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;

      const [
        student,
        totalDocs,
        readyDocs,
        notesCount,
        quizzesCount,
        recentDocs,
        recentConvs,
        unreadNotifs,
      ] = await Promise.all([
        DBStore.findStudentById(studentId),
        DBStore.countTotalDocuments(studentId),
        DBStore.countReadyDocuments(studentId),
        DBStore.countNotes(studentId),
        DBStore.countQuizzes(studentId),
        DBStore.findDocumentsByStudent(studentId),
        DBStore.findConversationsByStudent(studentId),
        DBStore.countUnreadNotifications(studentId),
      ]);

      const { passwordHash: _, ...safeStudent } = student || {};

      res.json({
        success: true,
        data: {
          student: safeStudent,
          counts: {
            totalDocuments: totalDocs,
            readyDocuments: readyDocs,
            generatedNotes: notesCount,
            generatedQuizzes: quizzesCount,
            recentChats: recentConvs.length,
            unreadNotifications: unreadNotifs,
          },
          recentDocuments: recentDocs.slice(0, 5),
          recentConversations: recentConvs.slice(0, 5),
        },
      });
    } catch (error: any) {
      console.error('Dashboard data error:', error);
      res.status(500).json({ success: false, message: 'Failed to load dashboard data.', error: error.message });
    }
  }
}
