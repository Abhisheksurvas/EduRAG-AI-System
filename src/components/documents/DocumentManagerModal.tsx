import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileUp,
  AlertTriangle,
} from 'lucide-react';
import { DocumentItem } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.js';

interface DocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument?: (doc: DocumentItem) => void;
  selectedDocId?: string | null;
  onDocumentsUpdated?: () => void;
}

export const DocumentManagerModal: React.FC<DocumentManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
  selectedDocId,
  onDocumentsUpdated,
}) => {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<any>(null);

  const fetchDocuments = async () => {
    try {
      const res = await api.getDocuments();
      if (res.success && res.documents) {
        setDocuments(res.documents);
        if (onDocumentsUpdated) onDocumentsUpdated();
      }
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchDocuments().finally(() => setLoading(false));

      // Poll periodically if any documents are processing
      pollingRef.current = setInterval(() => {
        fetchDocuments();
      }, 3000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen]);

  const handleUploadFile = async (file: File) => {
    if (documents.length >= 10) {
      showToast('Document limit reached. Maximum 10 documents allowed per student account.', 'warning');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'pptx', 'txt'].includes(ext || '')) {
      showToast(`Unsupported format (.${ext}). Allowed: PDF, DOCX, PPTX, TXT.`, 'error');
      return;
    }

    try {
      setUploading(true);
      showToast(`Uploading "${file.name}"... Starting text extraction and vector indexing.`, 'info');
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.uploadDocument(formData);
      if (res.success) {
        showToast(`"${file.name}" uploaded. Processing in background...`, 'success');
        await fetchDocuments();
      }
    } catch (err: any) {
      showToast(err.message || 'Document upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleLoadSampleNotes = async () => {
    try {
      setLoading(true);
      showToast('Loading CS802 Machine Learning & NLP Notes...', 'info');
      const res = await api.seedSampleDocuments();
      if (res.success) {
        showToast('CS802 ML & NLP Course Notes successfully loaded and vectorized!', 'success');
        await fetchDocuments();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load sample course notes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteOne = async (id: string, name: string) => {
    try {
      const res = await api.deleteDocument(id);
      if (res.success) {
        showToast(`Document "${name}" deleted successfully.`, 'success');
        setConfirmDeleteId(null);
        await fetchDocuments();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document.', 'error');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await api.deleteAllDocuments();
      if (res.success) {
        showToast('All documents deleted successfully.', 'success');
        setConfirmDeleteAll(false);
        await fetchDocuments();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete all documents.', 'error');
    }
  };

  if (!isOpen) return null;

  const readyCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 relative flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Study Materials Manager
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {readyCount} Ready / {documents.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload PDFs, DOCX, PPTX, or TXT (Max 10 files per student account)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="my-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadFile(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {uploading ? 'Processing & Vectorizing Document...' : 'Click to upload or drag & drop'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Supported formats: PDF, DOCX, PPTX, TXT (up to 25MB)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Preset: Load Sample College Notes */}
          <div className="mt-2.5 flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60">
            <div className="flex items-center gap-2">
              <FileUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  CS802 Machine Learning & NLP Syllabus Notes
                </p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                  Includes definitions, supervised/unsupervised examples, NLP pipeline & 6/8 marks exam theory.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSampleNotes();
              }}
              disabled={loading || uploading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition shrink-0 disabled:opacity-50"
            >
              Load Course Notes
            </button>
          </div>
        </div>

        {/* Document List Header with Actions */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Uploaded Materials ({documents.length}/10)
          </span>
          {documents.length > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All
            </button>
          )}
        </div>

        {/* Confirmation: Delete All */}
        {confirmDeleteAll && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs text-rose-900 dark:text-rose-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Are you sure you want to delete all study materials and vector chunks?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-medium"
              >
                Delete All
              </button>
            </div>
          </div>
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
            </div>
          )}

          {!loading && documents.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No documents uploaded yet. Upload your first PDF, DOCX, or PPTX to start RAG retrieval!
            </div>
          )}

          {documents.map((doc) => {
            const isSelected = selectedDocId === doc._id;

            return (
              <div
                key={doc._id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    if (doc.status === 'ready' && onSelectDocument) {
                      onSelectDocument(doc);
                      onClose();
                    }
                  }}
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 font-bold text-[10px] uppercase">
                    {doc.fileType}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {doc.originalName}
                      </p>
                      {/* Status Badge */}
                      {doc.status === 'ready' && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Ready
                        </span>
                      )}
                      {doc.status === 'processing' && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                          Processing {doc.processingProgress}%
                        </span>
                      )}
                      {doc.status === 'failed' && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          Failed
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {doc.totalPages} pages • {(doc.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>

                    {doc.error && (
                      <p className="text-[10px] text-rose-500 mt-0.5 truncate">
                        Error: {doc.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onSelectDocument && doc.status === 'ready' && (
                    <button
                      onClick={() => {
                        onSelectDocument(doc);
                        onClose();
                      }}
                      className={`text-xs px-2.5 py-1 rounded-xl font-medium transition ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600'
                      }`}
                    >
                      {isSelected ? 'Attached' : 'Select'}
                    </button>
                  )}

                  {confirmDeleteId === doc._id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteOne(doc._id, doc.originalName)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(doc._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
