import React, { useState, useEffect } from 'react';
import {
  FileText,
  X,
  Search,
  BookOpen,
  Layers,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Download,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';
import { DocumentItem } from '../../types/index.js';
import { api } from '../../services/api.js';
import { MarkdownViewer } from '../common/MarkdownViewer.js';

interface DocumentChunk {
  _id: string;
  pageNumber: number;
  chunkIndex: number;
  unit?: string;
  chapter?: string;
  text: string;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  initialPage?: number;
  onSelectForChat?: (doc: DocumentItem) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  initialPage = 1,
  onSelectForChat,
}) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<number>(initialPage);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      setSelectedPage(initialPage || 1);
      setSearchQuery('');
      setLoading(true);
      api
        .getDocumentChunks(document._id)
        .then((res) => {
          if (res.success && res.chunks) {
            setChunks(res.chunks);
          }
        })
        .catch((err) => {
          console.warn('Failed to load chunks:', err);
        })
        .finally(() => setLoading(false));
    } else {
      setChunks([]);
    }
  }, [isOpen, document, initialPage]);

  if (!isOpen || !document) return null;

  // Group chunks by page number
  const pageNumbers = Array.from(
    new Set(chunks.map((c) => c.pageNumber || 1))
  ).sort((a, b) => a - b);

  const totalPages = pageNumbers.length > 0 ? pageNumbers.length : (document.totalPages || 1);

  // Filter chunks by search or current page
  const filteredChunks = chunks.filter((c) => {
    if (searchQuery.trim()) {
      return (
        c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.unit && c.unit.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.chapter && c.chapter.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return (c.pageNumber || 1) === selectedPage;
  });

  const getBadgeColor = (type?: string) => {
    const ext = (type || '').toUpperCase();
    if (ext === 'PDF') return 'bg-rose-500 text-white border-rose-600';
    if (ext === 'DOCX' || ext === 'DOC') return 'bg-blue-600 text-white border-blue-700';
    if (ext === 'PPTX' || ext === 'PPT') return 'bg-amber-500 text-white border-amber-600';
    return 'bg-emerald-600 text-white border-emerald-700';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Study Note';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCopyFullPage = () => {
    const pageText = filteredChunks.map((c) => c.text).join('\n\n');
    navigator.clipboard.writeText(pageText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ChatGPT Style Document Header */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-xs shadow-sm shrink-0 border ${getBadgeColor(
                document.fileType
              )}`}
            >
              {document.fileType?.slice(0, 4) || 'DOC'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {document.originalName}
                </h3>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Indexed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{document.fileType || 'Document'}</span>
                <span>•</span>
                <span>{formatFileSize(document.fileSize)}</span>
                <span>•</span>
                <span>{totalPages} Page{totalPages > 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onSelectForChat && (
              <button
                onClick={() => {
                  onSelectForChat(document);
                  onClose();
                }}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs"
                title="Target this document in chat"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask About This Doc</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Page Selector */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keyword in notes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Page Navigator if not searching */}
          {!searchQuery && pageNumbers.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
              <button
                onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                disabled={selectedPage <= 1}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPage(p)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                    selectedPage === p
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  Page {p}
                </button>
              ))}
              <button
                onClick={() => setSelectedPage((p) => Math.min(pageNumbers[pageNumbers.length - 1], p + 1))}
                disabled={selectedPage >= pageNumbers[pageNumbers.length - 1]}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={handleCopyFullPage}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-1 ml-auto"
            title="Copy current page content"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Page</span>
              </>
            )}
          </button>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs">Loading document textbook pages & formulas...</p>
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">No content found for this search.</p>
              <p className="text-xs mt-1">Try searching another keyword or switch page.</p>
            </div>
          ) : (
            filteredChunks.map((chunk, idx) => (
              <div
                key={chunk._id || idx}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3"
              >
                {/* Chunk Header */}
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-400">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {chunk.unit || `Page ${chunk.pageNumber || selectedPage}`}
                    </span>
                    {chunk.chapter && (
                      <span className="text-slate-400 dark:text-slate-500 font-normal">
                        • {chunk.chapter}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Section {chunk.chunkIndex + 1}
                  </span>
                </div>

                {/* Render chunk with full markdown & understandable KaTeX formula support */}
                <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-xs sm:text-sm">
                  <MarkdownViewer content={chunk.text} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="truncate">
              Grounding context active for RAG examination answers
            </span>
          </div>
          {onSelectForChat && (
            <button
              onClick={() => {
                onSelectForChat(document);
                onClose();
              }}
              className="sm:hidden text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 text-white"
            >
              Ask About Doc
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
