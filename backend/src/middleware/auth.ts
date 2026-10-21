import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DBStore } from '../models/store.js';

export interface AuthenticatedRequest extends Request {
  student?: any;
  studentId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'edurag-ai-super-secret-key-2026';

export const generateToken = (student: any): string => {
  return jwt.sign(
    {
      id: student._id.toString(),
      email: student.email,
      name: student.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ success: false, message: 'Invalid token format.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const student = await DBStore.findStudentById(decoded.id);

    if (!student) {
      res.status(401).json({ success: false, message: 'Authenticated student no longer exists.' });
      return;
    }

    req.student = student;
    req.studentId = student._id.toString();
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session token.',
      error: error.message,
    });
  }
};
