import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { DBStore } from '../models/store.js';
import { generateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { SampleDocsService } from '../services/sampleDocsService.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, rollNo, branch, semester, year } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        return;
      }

      const existing = await DBStore.findStudentByEmail(email);
      if (existing) {
        res.status(409).json({ success: false, message: 'A student with this email address already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const student = await DBStore.createStudent({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        rollNo: rollNo?.trim() || 'CS-' + Math.floor(10 + Math.random() * 90),
        branch: branch?.trim() || 'Computer Science & Engineering',
        semester: semester?.trim() || 'Semester VIII',
        year: year?.trim() || 'Final Year (2025-2026)',
        goals: 'Pass semester exams with distinction and master RAG systems.',
        avatar: '',
      });

      // Create initial welcome notification
      await DBStore.createNotification({
        studentId: student._id.toString(),
        type: 'system',
        title: 'Welcome to EduRAG AI',
        message: 'Your account has been configured with CS802 Machine Learning & NLP Syllabus Notes. Start asking questions in AI Assistant!',
        read: false,
      });

      // Seed sample course notes in background
      SampleDocsService.seedSampleDocumentsForStudent(student._id.toString()).catch((e) =>
        console.error('Background seed error:', e)
      );

      const token = generateToken(student);

      const { passwordHash: _, ...safeStudent } = student;
      res.status(201).json({
        success: true,
        message: 'Registration successful.',
        token,
        student: safeStudent,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Server error during registration.', error: error.message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      const student = await DBStore.findStudentByEmail(email);
      if (!student) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, student.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const token = generateToken(student);
      const { passwordHash: _, ...safeStudent } = student;

      // Ensure student has sample ML & NLP notes seeded
      SampleDocsService.seedSampleDocumentsForStudent(student._id.toString()).catch((e) =>
        console.error('Background seed error on login:', e)
      );

      res.json({
        success: true,
        message: 'Login successful.',
        token,
        student: safeStudent,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error during login.', error: error.message });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const student = await DBStore.findStudentById(req.studentId!);
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found.' });
        return;
      }

      const { passwordHash: _, ...safeStudent } = student;
      res.json({ success: true, student: safeStudent });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Server error.', error: error.message });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Logged out successfully.' });
  }
}
