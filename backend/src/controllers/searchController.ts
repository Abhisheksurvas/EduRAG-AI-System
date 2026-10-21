import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DBStore } from '../models/store.js';

export class SearchController {
  static async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.studentId!;
      const query = (req.query.q as string) || '';

      const results = await DBStore.globalSearch(studentId, query);
      res.json({ success: true, query, results });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Search query failed.', error: error.message });
    }
  }
}
