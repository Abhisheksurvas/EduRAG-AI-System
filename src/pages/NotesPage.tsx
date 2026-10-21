import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  Sparkles,
  FileText,
  Trash2,
  Edit2,
  Download,
  Eye,
  Plus,
  Loader2,
  X,
  FileDown,
  Clock,
  CheckCircle2,
  UploadCloud,
  Check,
  AlertCircle,
  FileUp,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { NoteItem, DocumentItem } from '../types/index.js';
import { api } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import { DocumentManagerModal } from '../components/documents/DocumentManagerModal.js';
import { MarkdownViewer } from '../components/common/MarkdownViewer.js';

export const NotesPage: React.FC = () => {
  const { showToast } = useToast();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [unit, setUnit] = useState('');
  const [chapter, setChapter] = useState('');
  const [promptType, setPromptType] = useState('Chapter Summary');
  const [customPrompt, setCustomPrompt] = useState('');

  // Right Side "Generated Notes" State
  const [displayedNote, setDisplayedNote] = useState<NoteItem | null>(null);

  // View / Edit Modal
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const promptOptions = [
    {
      title: 'Chapter Summary',
      desc: 'Comprehensive structural overview and thematic analysis of the chapter',
    },
    {
      title: 'Key Points',
      desc: 'Core vital insights and high-yield takeaways from the material',
    },
    {
      title: 'Definitions',
      desc: 'Crucial terminology, formal principles, and conceptual glossary',
    },
    {
      title: 'Formula Sheet',
      desc: 'KaTeX equations ($$ ... $$) with variable breakdowns, intuition & worked examples',
    },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const [notesRes, docsRes] = await Promise.all([
        api.getNotes(),
        api.getDocuments(),
      ]);

      if (notesRes.success && notesRes.notes) {
        setNotes(notesRes.notes);
        if (notesRes.notes.length > 0) {
          setDisplayedNote(notesRes.notes[0]);
        }
      }
      if (docsRes.success && docsRes.documents) {
        setDocuments(docsRes.documents);
        const readyDoc = docsRes.documents.find((d: any) => d.status === 'ready');
        if (readyDoc && !selectedDocId) {
          setSelectedDocId(readyDoc._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load notes data:', err);
      showToast('Failed to load notes data from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      showToast('Please select an uploaded study document.', 'warning');
      return;
    }

    try {
      setGenerating(true);
      showToast('Retrieving document chunks & synthesizing grounded notes...', 'info');

      const res = await api.generateNotes({
        documentId: selectedDocId,
        unit: unit.trim() || undefined,
        chapter: chapter.trim() || undefined,
        promptType,
        customPrompt: promptType === 'Custom prompt' ? customPrompt.trim() : undefined,
      });

      if (res.success && res.note) {
        setNotes((prev) => [res.note, ...prev]);
        setDisplayedNote(res.note);
        showToast('Notes synthesized and saved to your account!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate notes.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyNote = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    showToast('Note content copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = async () => {
    if (!activeNote) return;

    try {
      const res = await api.updateNote(activeNote._id, {
        title: editTitle,
        content: editContent,
      });

      if (res.success && res.note) {
        setNotes((prev) => prev.map((n) => (n._id === activeNote._id ? res.note : n)));
        setActiveNote(res.note);
        if (displayedNote?._id === activeNote._id) {
          setDisplayedNote(res.note);
        }
        setIsEditingNote(false);
        showToast('Note updated successfully.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save note.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.deleteNote(id);
      if (res.success) {
        setNotes((prev) => prev.filter((n) => n._id !== id));
        if (activeNote?._id === id) setActiveNote(null);
        if (displayedNote?._id === id) {
          const remaining = notes.filter((n) => n._id !== id);
          setDisplayedNote(remaining.length > 0 ? remaining[0] : null);
        }
        showToast('Note deleted successfully.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete note.', 'error');
    }
  };

  const handleDeleteAll = async () => {
    try {
      setDeletingAll(true);
      const res = await api.deleteAllNotes();
      if (res.success) {
        setNotes([]);
        setActiveNote(null);
        setDisplayedNote(null);
        setShowDeleteAllModal(false);
        showToast('All your generated notes have been cleared.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete notes.', 'error');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleExport = (noteId: string, format: 'txt' | 'docx' | 'pdf') => {
    window.open(`/api/notes/${noteId}/export?format=${format}`, '_blank');
  };

  const readyDocuments = documents.filter((d) => d.status === 'ready');
  const selectedDoc = documents.find((d) => d._id === selectedDocId);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-xs">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Notes Generator
          </h1>
        </div>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          Synthesize flashcards, takeaways, and revision guides from your materials.
        </p>
      </div>

      {/* Main 2-Column Section: Left Generator | Right Generated Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Generator Controls Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* 1. Select Study Material & Upload New */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Select Study Material
                </label>
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload New</span>
                </button>
              </div>

              {readyDocuments.length === 0 ? (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>No ready documents</span>
                  <button
                    type="button"
                    onClick={() => setIsDocModalOpen(true)}
                    className="underline font-bold text-[11px]"
                  >
                    Upload Study Material
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
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

                  <button
                    type="button"
                    onClick={() => setIsDocModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Upload Study Material</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Target Unit / Module (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Target Unit / Module (Optional)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. Unit 3 or Module II"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* 3. Chapter / Section (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Chapter / Section (Optional)
              </label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. Public Key Cryptography"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* 4. Note Type: Select structure */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Note Type
                </label>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  • Select structure
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {promptOptions.map((opt) => {
                  const isSelected = promptType === opt.title;
                  return (
                    <div
                      key={opt.title}
                      onClick={() => setPromptType(opt.title)}
                      className={`p-3 rounded-2xl border cursor-pointer transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 shadow-xs ring-2 ring-indigo-500/25'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-extrabold block">
                            {opt.title}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                          "{opt.desc}"
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Prompt if needed */}
            {promptType === 'Custom prompt' && (
              <div className="animate-in fade-in">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Specify Custom Prompt Directive
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Synthesize a 3-column markdown cheat sheet detailing all formula variables, SI units, and theorem corollaries..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            )}

            {/* Generate Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={generating || !selectedDocId}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 disabled:opacity-50 transition cursor-pointer"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>{generating ? 'Synthesizing Notes from Material...' : 'Generate Notes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Generated Notes Display */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs min-h-[520px] flex flex-col justify-between">
          <div>
            {/* Header of Generated Notes Card */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Generated Notes
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Grounded syntheses strictly from selected course material
                  </p>
                </div>
              </div>

              {/* Action Toolbar if note is displayed */}
              {displayedNote && !generating && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyNote(displayedNote.content)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Copy note content"
                  >
                    {copied ? (
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                    <button
                      onClick={() => handleExport(displayedNote._id, 'txt')}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
                      title="Export as TXT"
                    >
                      TXT
                    </button>
                    <button
                      onClick={() => handleExport(displayedNote._id, 'docx')}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
                      title="Export as DOCX"
                    >
                      DOCX
                    </button>
                    <button
                      onClick={() => handleExport(displayedNote._id, 'pdf')}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
                      title="Export as PDF"
                    >
                      PDF
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNote(displayedNote);
                      setIsEditingNote(true);
                      setEditTitle(displayedNote.title);
                      setEditContent(displayedNote.content);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Edit Note"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Generated Notes Body */}
            {generating ? (
              <div className="py-24 text-center space-y-3 animate-in fade-in">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Synthesizing Notes from Study Material...
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Retrieving relevant chunks from MongoDB and generating verified educational notes.
                </p>
              </div>
            ) : displayedNote ? (
              <div className="space-y-4 animate-in fade-in">
                {/* Note Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {displayedNote.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{displayedNote.documentName || 'Course Material'}</span>
                      {(displayedNote.unit || displayedNote.chapter) && (
                        <span>
                          • {displayedNote.unit && `Unit ${displayedNote.unit}`}
                          {displayedNote.unit && displayedNote.chapter && ' - '}
                          {displayedNote.chapter && displayedNote.chapter}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80">
                      {displayedNote.prompt}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(displayedNote.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Rendered Markdown Content */}
                <div className="prose dark:prose-invert max-w-none text-xs md:text-sm max-h-[460px] overflow-y-auto pr-2 rounded-xl">
                  <MarkdownViewer content={displayedNote.content} />
                </div>
              </div>
            ) : (
              /* Empty Placeholder State */
              <div className="py-24 text-center space-y-3">
                <BookOpenCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No Notes Generated Yet
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Select your study material, target unit/chapter, and structure on the left, then click <strong>Generate Notes</strong> to synthesize notes here in real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT NOTES (N) - HORIZONTAL SECTION BELOW BOTH COLUMNS */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              RECENT NOTES ({notes.length})
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              • Persistent under your student account
            </span>
          </div>

          {notes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
              title="Delete all your notes"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading your saved study notes from MongoDB...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400 space-y-2">
            <BookOpenCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
              No recent notes.
            </p>
            <p className="max-w-md mx-auto text-slate-400">
              Configure your study material and note type above to synthesize grounded study notes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <div
                key={note._id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                  displayedNote?._id === note._id
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Note Type Badge & Date */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 truncate">
                      {note.prompt}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(note.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Note Title */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-1">
                    {note.title}
                  </h3>

                  {/* Source Document */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-medium truncate">{note.documentName || 'Study Material'}</span>
                  </p>

                  {/* Unit / Chapter Badge */}
                  {(note.unit || note.chapter) && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                      {note.unit && <span>Unit: {note.unit}</span>}
                      {note.unit && note.chapter && <span> • </span>}
                      {note.chapter && <span>Chapter: {note.chapter}</span>}
                    </p>
                  )}

                  {/* Content Snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans">
                    {note.content.replace(/^[#\s*_-]+/gm, '')}
                  </p>
                </div>

                {/* Card Actions Footer: View, Edit & Delete */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setDisplayedNote(note);
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Note</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleExport(note._id, 'txt')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Download as TXT"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveNote(note);
                        setIsEditingNote(true);
                        setEditTitle(note.title);
                        setEditContent(note.content);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit note"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(note._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note View / Edit Modal */}
      {activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full p-6 relative flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                {isEditingNote ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-base font-bold text-slate-900 dark:text-white border-b border-indigo-500 bg-transparent focus:outline-none"
                  />
                ) : (
                  <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {activeNote.title}
                  </h2>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Source: {activeNote.documentName || 'Document'} • Directive: {activeNote.prompt}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                {/* Export Options */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => handleExport(activeNote._id, 'txt')}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
                    title="Export as TXT"
                  >
                    TXT
                  </button>
                  <button
                    onClick={() => handleExport(activeNote._id, 'docx')}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
                    title="Export as DOC"
                  >
                    DOCX
                  </button>
                  <button
                    onClick={() => handleExport(activeNote._id, 'pdf')}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
                    title="Print / Save as PDF"
                  >
                    PDF
                  </button>
                </div>

                <button
                  onClick={() => {
                    setActiveNote(null);
                    setIsEditingNote(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4">
              {isEditingNote ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[350px] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none text-xs md:text-sm">
                  <MarkdownViewer content={activeNote.content} />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Created: {new Date(activeNote.createdAt).toLocaleString()}
              </span>

              <div className="flex items-center gap-2">
                {isEditingNote ? (
                  <>
                    <button
                      onClick={() => setIsEditingNote(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingNote(true);
                        setEditTitle(activeNote.title);
                        setEditContent(activeNote.content);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Edit Note
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(activeNote._id);
                        setActiveNote(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Delete All Notes?
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete all {notes.length} notes generated for your student account? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAll}
                onClick={handleDeleteAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
              >
                {deletingAll ? 'Deleting...' : 'Yes, Delete All'}
              </button>
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
          showToast(`Selected "${doc.originalName}" for note synthesis.`, 'info');
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

export default NotesPage;
