import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Sparkles,
  Play,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  FileText,
  Loader2,
  X,
  History,
  Send,
  FileUp,
  Check,
  Eye,
  Percent,
} from 'lucide-react';
import { QuizItem, DocumentItem } from '../types/index.js';
import { api } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import { DocumentManagerModal } from '../components/documents/DocumentManagerModal.js';

export const QuizCenterPage: React.FC = () => {
  const { showToast } = useToast();

  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Form State
  const [selectedDocId, setSelectedDocId] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState(10);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Active Quiz Player State
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quizRes, docsRes] = await Promise.all([
        api.getQuizzes(),
        api.getDocuments(),
      ]);

      if (quizRes.success && quizRes.quizzes) {
        setQuizzes(quizRes.quizzes);
      }
      if (docsRes.success && docsRes.documents) {
        setDocuments(docsRes.documents);
        const readyDoc = docsRes.documents.find((d: any) => d.status === 'ready');
        if (readyDoc && !selectedDocId) {
          setSelectedDocId(readyDoc._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load quiz center data:', err);
      showToast('Failed to load quizzes from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerationError(null);
    if (!selectedDocId) {
      showToast('Please select an uploaded study document.', 'warning');
      return;
    }

    try {
      setGenerating(true);
      showToast('Retrieving document chunks & validating grounded questions with AI...', 'info');

      const res = await api.generateQuiz({
        documentId: selectedDocId,
        topic: topic.trim() || undefined,
        difficulty,
        questionCount,
        timeLimit: timeLimit ? Number(timeLimit) : undefined,
      });

      if (res.success && res.quiz) {
        setQuizzes((prev) => [res.quiz, ...prev]);
        showToast('Dynamic quiz generated and verified from study material!', 'success');
        startQuiz(res.quiz);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to generate quiz.';
      setGenerationError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const startQuiz = (quiz: QuizItem) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    // Preload answers if already answered
    const existing: Record<number, number> = {};
    quiz.questions.forEach((q) => {
      if (q.selectedAnswer !== null && q.selectedAnswer !== undefined) {
        existing[q.questionNumber] = q.selectedAnswer;
      }
    });
    setUserAnswers(existing);
    setQuizResult(
      quiz.status === 'completed'
        ? {
            score: quiz.score || 0,
            correctCount: Math.round(((quiz.score || 0) / 100) * quiz.questions.length),
            totalQuestions: quiz.questions.length,
          }
        : null
    );
  };

  const handleSelectOption = (optionIndex: number) => {
    if (!activeQuiz || activeQuiz.status === 'completed') return;
    const qNum = activeQuiz.questions[currentQuestionIndex].questionNumber;
    setUserAnswers((prev) => ({
      ...prev,
      [qNum]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    try {
      setSubmitting(true);
      const res = await api.submitQuiz(activeQuiz._id, userAnswers);

      if (res.success && res.quiz) {
        setQuizzes((prev) => prev.map((q) => (q._id === activeQuiz._id ? res.quiz : q)));
        setActiveQuiz(res.quiz);
        setQuizResult({
          score: res.score,
          correctCount: res.correctCount,
          totalQuestions: res.totalQuestions,
        });
        showToast(`Quiz completed! You scored ${res.score}%.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit quiz.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryQuiz = async (quizId: string) => {
    try {
      const res = await api.retryQuiz(quizId);
      if (res.success && res.quiz) {
        setQuizzes((prev) => prev.map((q) => (q._id === quizId ? res.quiz : q)));
        startQuiz(res.quiz);
        showToast('Quiz reset. Good luck!', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reset quiz.', 'error');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const res = await api.deleteQuiz(quizId);
      if (res.success) {
        setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
        if (activeQuiz?._id === quizId) setActiveQuiz(null);
        showToast('Quiz deleted.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete quiz.', 'error');
    }
  };

  const readyDocuments = documents.filter((d) => d.status === 'ready');
  const unattemptedQuizzes = quizzes.filter(
    (q) => q.status === 'unattempted' || q.status === 'in_progress'
  );
  const historyQuizzes = quizzes.filter((q) => q.status === 'completed');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Quiz Center
          </h1>
        </div>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          Dynamically generate and take MCQs verified strictly from your uploaded course materials.
        </p>
      </div>

      {/* MAIN GENERATOR CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Generate Study Material Grounded Quiz</span>
        </h2>

        {generationError && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-rose-900 dark:text-rose-100 block mb-1">
                {generationError}
              </span>
              {generationError.includes('not found in the selected study material') && (
                <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                  EduRAG verifies all quizzes strictly against your uploaded study materials and never generates outside ungrounded questions. Try specifying another topic or clear the Topic field to generate from the whole document.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setGenerationError(null)}
              className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 p-0.5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleGenerateQuiz} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Target Material */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Target Material
              </label>
              {readyDocuments.length === 0 ? (
                <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>No ready docs</span>
                  <button
                    type="button"
                    onClick={() => setIsDocModalOpen(true)}
                    className="underline font-bold text-[11px]"
                  >
                    Upload now
                  </button>
                </div>
              ) : (
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
                >
                  {readyDocuments.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.originalName} ({doc.totalPages} pages)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Upload
              </label>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs md:text-sm font-semibold transition cursor-pointer"
              >
                <FileUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Upload Material</span>
              </button>
            </div>

            {/* 3. Topic / Unit (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Topic / Unit (Optional)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Unit 3 Deep Learning"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* 4. Difficulty Level */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium (Exam Standard)</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* 5. Questions */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
              >
                <option value={5}>5 MCQs</option>
                <option value={10}>10 MCQs</option>
                <option value={15}>15 MCQs</option>
                <option value={20}>20 MCQs</option>
              </select>
            </div>

            {/* 6. Time (Min) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Time (Min)
              </label>
              <input
                type="number"
                min={2}
                max={60}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                placeholder="10"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={generating || !selectedDocId}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold text-sm shadow-md shadow-indigo-500/25 disabled:opacity-50 transition cursor-pointer"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>{generating ? 'Verifying Material & Generating...' : 'Generate Grounded Quiz'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* UNATTEMPTED QUIZZES SECTION */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
              <Play className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Unattempted Quizzes ({unattemptedQuizzes.length})
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              • Ready for practice
            </span>
          </div>
        </div>

        {/* Quiz Cards Display (Two-Column Grid on Desktop) */}
        {loading ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading student quizzes from MongoDB...</p>
          </div>
        ) : unattemptedQuizzes.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400 space-y-2">
            <HelpCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
              No unattempted quizzes. Generate a new quiz above to start testing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unattemptedQuizzes.map((quiz) => (
              <div
                key={quiz._id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Difficulty & Questions Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        quiz.difficulty === 'Easy'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80'
                          : quiz.difficulty === 'Hard'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200/80'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80'
                      }`}
                    >
                      {quiz.difficulty}
                    </span>

                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(quiz.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Quiz Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 mb-1.5">
                    {quiz.title}
                  </h3>

                  {/* Source Document */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate mb-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-medium truncate">{quiz.documentName || 'Study Material'}</span>
                  </p>

                  {/* Topic / Unit */}
                  {quiz.topic && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mb-2">
                      Topic: <span className="text-slate-600 dark:text-slate-300 font-medium">{quiz.topic}</span>
                    </p>
                  )}

                  {/* Details: Questions & Time Limit */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {quiz.questionCount} Questions
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {quiz.timeLimit} mins limit
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer: Attempt Quiz & Delete Icon */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => startQuiz(quiz)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Attempt Quiz</span>
                  </button>

                  <button
                    onClick={() => handleDeleteQuiz(quiz._id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Delete quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUIZ HISTORY SECTION (BELOW UNATTEMPTED QUIZZES) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Quiz History ({historyQuizzes.length})
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              • Completed attempts from MongoDB
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading quiz history from MongoDB...</p>
          </div>
        ) : historyQuizzes.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
              No completed quizzes yet.
            </p>
            <p>Attempt and submit a quiz above to view your real score history from MongoDB.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historyQuizzes.map((quiz) => {
              const scorePercent = typeof quiz.score === 'number' ? quiz.score : 0;
              const isPassed = scorePercent >= 60;

              return (
                <div
                  key={quiz._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Score Badge & Difficulty */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                            isPassed
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          <Award className="w-4 h-4" />
                          <span>Score: {scorePercent}%</span>
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            quiz.difficulty === 'Easy'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80'
                              : quiz.difficulty === 'Hard'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80'
                          }`}
                        >
                          {quiz.difficulty}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(quiz.completedAt || quiz.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Quiz Title */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 mb-1.5">
                      {quiz.title}
                    </h3>

                    {/* Source Document */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate mb-1">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-medium truncate">{quiz.documentName || 'Study Material'}</span>
                    </p>

                    {/* Topic */}
                    {quiz.topic && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mb-2">
                        Topic: <span className="text-slate-600 dark:text-slate-300 font-medium">{quiz.topic}</span>
                      </p>
                    )}

                    {/* Score Breakdown */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {quiz.questions.length} Total MCQs
                      </span>
                      <span>•</span>
                      <span>
                        {Math.round((scorePercent / 100) * quiz.questions.length)} Correct
                      </span>
                      <span>•</span>
                      <span>
                        {quiz.questions.length - Math.round((scorePercent / 100) * quiz.questions.length)} Incorrect
                      </span>
                    </div>
                  </div>

                  {/* Card Actions Footer: View Result, Retry, Delete */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => startQuiz(quiz)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Result</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRetryQuiz(quiz._id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                        title="Retry Quiz"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz._id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* INTERACTIVE QUIZ PLAYER MODAL                             */}
      {/* ======================================================== */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full p-6 relative flex flex-col max-h-[88vh] overflow-hidden">
            {/* Player Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeQuiz.difficulty === 'Easy'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : activeQuiz.difficulty === 'Hard'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {activeQuiz.difficulty}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {activeQuiz.documentName}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {activeQuiz.title}
                </h3>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-4">
                {quizResult && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Score: {quizResult.score}%</span>
                  </div>
                )}
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Question Progress Bar */}
            <div className="py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
                <span>
                  Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                </span>
                <span>
                  {Math.round(((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Current Question Body */}
            {activeQuiz.questions[currentQuestionIndex] && (() => {
              const q = activeQuiz.questions[currentQuestionIndex];
              const selectedOption = userAnswers[q.questionNumber];
              const isSubmitted = activeQuiz.status === 'completed';

              return (
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  {/* Question Stem */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                      Question #{q.questionNumber}
                    </span>
                    <p className="text-sm md:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {q.question}
                    </p>
                  </div>

                  {/* 4 Options */}
                  <div className="space-y-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOption === optIdx;
                      const isCorrect = isSubmitted && q.correctAnswer === optIdx;
                      const isWrongSelection = isSubmitted && isOptionSelected && !isCorrect;

                      let optionClasses =
                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600';

                      if (isSubmitted) {
                        if (isCorrect) {
                          optionClasses =
                            'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20';
                        } else if (isWrongSelection) {
                          optionClasses =
                            'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20';
                        } else {
                          optionClasses = 'border-slate-200 dark:border-slate-800 opacity-60';
                        }
                      } else if (isOptionSelected) {
                        optionClasses =
                          'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/30 font-semibold';
                      }

                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(optIdx)}
                          className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer select-none ${optionClasses}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSubmitted && isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : isSubmitted && isWrongSelection
                                  ? 'bg-rose-600 text-white'
                                  : isOptionSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="text-xs md:text-sm font-medium leading-relaxed">
                              {opt}
                            </span>
                          </div>

                          {isSubmitted && isCorrect && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                          {isSubmitted && isWrongSelection && (
                            <X className="w-4 h-4 text-rose-600 shrink-0 ml-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grounded Explanation & Verified Page Citation (in Review mode) */}
                  {isSubmitted && (
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Grounded Explanation:</span>
                        </span>
                        {q.sourcePage && (
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 font-bold text-[10px] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                            Verified on Page {q.sourcePage}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Player Navigation Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIndex((prev) =>
                        Math.min(activeQuiz.questions.length - 1, prev + 1)
                      )
                    }
                    className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : activeQuiz.status !== 'completed' ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitQuiz}
                    className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{submitting ? 'Submitting...' : 'Submit Final Quiz'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveQuiz(null)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition"
                  >
                    Close Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Manager Modal (Existing Upload/Index System) */}
      <DocumentManagerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        selectedDocId={selectedDocId}
        onSelectDocument={(doc) => {
          setSelectedDocId(doc._id);
          setIsDocModalOpen(false);
          showToast(`Target material set to "${doc.originalName}".`, 'info');
        }}
        onDocumentsUpdated={async () => {
          const res = await api.getDocuments();
          if (res.success && res.documents) {
            setDocuments(res.documents);
          }
        }}
      />
    </div>
  );
};

export default QuizCenterPage;
