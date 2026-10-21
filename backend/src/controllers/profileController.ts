import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DBStore } from '../models/store.js';

export class ProfileController {
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const student = await DBStore.findStudentById(studentId);

      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found.' });
        return;
      }

      const { passwordHash: _, ...safeStudent } = student;
      res.json({ success: true, profile: safeStudent });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch student profile.', error: error.message });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const { name, rollNo, branch, semester, year, goals, avatar } = req.body;

      const updates: any = {};
      if (name) updates.name = name.trim();
      if (rollNo !== undefined) updates.rollNo = rollNo.trim();
      if (branch !== undefined) updates.branch = branch.trim();
      if (semester !== undefined) updates.semester = semester.trim();
      if (year !== undefined) updates.year = year.trim();
      if (goals !== undefined) updates.goals = goals.trim();
      if (avatar !== undefined) updates.avatar = avatar;

      const updated = await DBStore.updateStudent(studentId, updates);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Student not found.' });
        return;
      }

      await DBStore.createNotification({
        studentId,
        type: 'system',
        title: 'Profile Updated',
        message: 'Your student academic profile details have been saved.',
        read: false,
      });

      const { passwordHash: _, ...safeStudent } = updated;
      res.json({ success: true, profile: safeStudent });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to update profile.', error: error.message });
    }
  }
}
