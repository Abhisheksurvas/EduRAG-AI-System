import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  BookOpenCheck,
  HelpCircle,
  MessageSquare,
  BotMessageSquare,
  UploadCloud,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { api } from '../../src/services/api.js';
import { DocumentManagerModal } from '../components/documents/DocumentManagerModal.js';

interface DashboardPageProps {
  onNavigate: (path: string, state?: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { student } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<{
    counts: {
      totalDocuments: number;
      readyDocuments: number;
      generatedNotes: number;
      generatedQuizzes: number;
      recentChats: number;
      unreadNotifications: number;
    };
    recentDocuments: any[];
    recentConversations: any[];
  }>({
    counts: {
      totalDocuments: 0,
      readyDocuments: 0,
      generatedNotes: 0,
      generatedQuizzes: 0,
      recentChats: 0,
      unreadNotifications: 0,
    },
    recentDocuments: [],
    recentConversations: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = [
    {
      title: 'Uploaded Materials',
      count: dashboardData.counts.totalDocuments,
      label: 'All Documents',
      icon: FileText,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Ready for RAG',
      count: dashboardData.counts.readyDocuments,
      label: 'Indexed Chunks',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Generated Notes',
      count: dashboardData.counts.generatedNotes,
      label: 'Revision Guides',
      icon: BookOpenCheck,
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-50 dark:bg-violet-950/40',
      textColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      title: 'Generated Quizzes',
      count: dashboardData.counts.generatedQuizzes,
      label: 'Grounded Tests',
      icon: HelpCircle,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Recent Chats',
      count: dashboardData.counts.recentChats,
      label: 'Study Threads',
      icon: MessageSquare,
      color: 'from-sky-500 to-cyan-600',
      bgColor: 'bg-sky-50 dark:bg-sky-950/40',
      textColor: 'text-sky-600 dark:text-sky-400',
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white p-6 md:p-8 shadow-xl shadow-indigo-500/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>EduRAG AI Student Workspace</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {student?.name || 'Student'}! 👋
            </h1>
            <p className="text-sm text-blue-100 max-w-xl mt-1.5 leading-relaxed">
              Your college retrieval-augmented generation engine is active. Ask questions grounded in your course notes or take dynamic quizzes.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-blue-100/90 font-medium">
              <span>Branch: {student?.branch || 'CSE'}</span>
              <span>•</span>
              <span>Semester: {student?.semester || 'VIII'}</span>
              <span>•</span>
              <span>Roll: {student?.rollNo || 'CS-01'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('/student-dashboard/ai-assistant')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-slate-900 font-bold text-xs md:text-sm hover:bg-blue-50 shadow-lg shadow-black/10 transition"
            >
              <BotMessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Ask AI Assistant</span>
            </button>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-semibold text-xs md:text-sm transition border border-white/25"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Material</span>
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 5 Real Dynamic Stat Cards from MongoDB */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {item.title}
                </span>
                <div className={`p-2 rounded-xl ${item.bgColor} ${item.textColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : item.count}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {item.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quick Study Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => onNavigate('/student-dashboard/ai-assistant')}
            className="flex flex-col items-start p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BotMessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">Ask AI (RAG)</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Dual-mode study grounded chat</span>
          </button>

          <button
            onClick={() => setIsDocModalOpen(true)}
            className="flex flex-col items-start p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs hover:shadow-md transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">Upload Material</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">PDF, DOCX, PPTX, TXT</span>
          </button>

          <button
            onClick={() => onNavigate('/student-dashboard/notes')}
            className="flex flex-col items-start p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 shadow-xs hover:shadow-md transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">Generate Notes</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Flashcards, takeaways, summary</span>
          </button>

          <button
            onClick={() => onNavigate('/student-dashboard/quiz-center')}
            className="flex flex-col items-start p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 shadow-xs hover:shadow-md transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">Create Quiz</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Strictly context-grounded MCQs</span>
          </button>
        </div>
      </div>

      {/* Two Column Section: Recent Documents & Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Documents
              </h3>
            </div>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Manage All
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            {dashboardData.recentDocuments.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No study materials uploaded yet.{' '}
                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="text-blue-600 dark:text-blue-400 underline font-semibold ml-1"
                >
                  Upload your first document
                </button>
              </div>
            ) : (
              dashboardData.recentDocuments.map((doc: any) => (
                <div
                  key={doc._id}
                  onClick={() => onNavigate('/student-dashboard/ai-assistant', { attachedDocId: doc._id })}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase shrink-0">
                      {doc.fileType}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {doc.originalName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {doc.totalPages} pages • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {doc.status === 'ready' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Ready
                      </span>
                    )}
                    {doc.status === 'processing' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse">
                        Processing
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        Failed
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Conversations Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent AI Study Chats
              </h3>
            </div>
            <button
              onClick={() => onNavigate('/student-dashboard/ai-assistant')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            {dashboardData.recentConversations.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No conversations yet.{' '}
                <button
                  onClick={() => onNavigate('/student-dashboard/ai-assistant')}
                  className="text-indigo-600 dark:text-indigo-400 underline font-semibold ml-1"
                >
                  Start a study session
                </button>
              </div>
            ) : (
              dashboardData.recentConversations.map((conv: any) => (
                <div
                  key={conv._id}
                  onClick={() => onNavigate('/student-dashboard/ai-assistant', { conversationId: conv._id })}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {conv.title}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(conv.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Document Manager Modal */}
      <DocumentManagerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onDocumentsUpdated={loadData}
      />
    </div>
  );
};
