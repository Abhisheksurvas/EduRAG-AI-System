import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DBStore } from '../models/store.js';

export class NotificationController {
  static async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const notifications = await DBStore.findNotificationsByStudent(studentId);
      const unreadCount = await DBStore.countUnreadNotifications(studentId);

      res.json({
        success: true,
        notifications,
        unreadCount,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch notifications.', error: error.message });
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const notifId = req.params.id;

      const updated = await DBStore.markNotificationRead(notifId, studentId);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Notification not found.' });
        return;
      }

      res.json({ success: true, notification: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error marking notification read.', error: error.message });
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      await DBStore.markAllNotificationsRead(studentId);
      res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating notifications.', error: error.message });
    }
  }

  static async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const notifId = req.params.id;
      await DBStore.deleteNotification(notifId, studentId);
      res.json({ success: true, message: 'Notification deleted.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error deleting notification.', error: error.message });
    }
  }

  static async deleteAllNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      await DBStore.deleteAllNotifications(studentId);
      res.json({ success: true, message: 'All notifications cleared.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error clearing notifications.', error: error.message });
    }
  }
}
