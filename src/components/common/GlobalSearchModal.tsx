import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, MessageSquare, BookOpenCheck, HelpCircle, X, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../contexts/LanguageContext.js';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string, itemData?: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    documents: any[];
    conversations: any[];
    notes: any[];
    quizzes: any[];
  }>({
    documents: [],
    conversations: [],
    notes: [],
    quizzes: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ documents: [], conversations: [], notes: [], quizzes: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ documents: [], conversations: [], notes: [], quizzes: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.search(query.trim());
        if (res.success && res.results) {
          setResults(res.results);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.documents.length +
    results.conversations.length +
    results.notes.length +
    results.quizzes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('nav.searchPlaceholder', 'Search courses, notes, quizzes, chats...')}
            className="flex-1 bg-transparent border-none text-sm md:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!query.trim() && (
            <div className="text-center py-10 text-slate-400 text-xs">
              Type keywords to search across your uploaded documents, study notes, dynamic quizzes, and chat history.
            </div>
          )}

          {query.trim() && totalResults === 0 && !loading && (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
              No matching records found for "{query}".
            </div>
          )}

          {/* Documents */}
          {results.documents.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Study Documents ({results.documents.length})
              </span>
              <div className="space-y-1.5">
                {results.documents.map((doc: any) => (
                  <div
                    key={doc._id}
                    onClick={() => {
                      onClose();
                      onNavigate('/student-dashboard/ai-assistant', { attachedDocId: doc._id });
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {doc.originalName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {doc.totalPages} pages • {doc.fileType} • {doc.status}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {results.notes.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Generated Notes ({results.notes.length})
              </span>
              <div className="space-y-1.5">
                {results.notes.map((note: any) => (
                  <div
                    key={note._id}
                    onClick={() => {
                      onClose();
                      onNavigate('/student-dashboard/notes', { noteId: note._id });
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpenCheck className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {note.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {note.documentName || 'Study Material'} • {note.prompt}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quizzes */}
          {results.quizzes.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Quizzes ({results.quizzes.length})
              </span>
              <div className="space-y-1.5">
                {results.quizzes.map((quiz: any) => (
                  <div
                    key={quiz._id}
                    onClick={() => {
                      onClose();
                      onNavigate('/student-dashboard/quiz-center', { quizId: quiz._id });
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {quiz.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {quiz.questionCount} Questions • {quiz.difficulty} • Score: {quiz.score}%
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversations */}
          {results.conversations.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                AI Chats ({results.conversations.length})
              </span>
              <div className="space-y-1.5">
                {results.conversations.map((conv: any) => (
                  <div
                    key={conv._id}
                    onClick={() => {
                      onClose();
                      onNavigate('/student-dashboard/ai-assistant', { conversationId: conv._id });
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Last active: {new Date(conv.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
