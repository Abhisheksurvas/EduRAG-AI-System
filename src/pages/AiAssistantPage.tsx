import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Paperclip,
  Send,
  FileText,
  CheckCircle2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
  X,
  BookOpen,
  Cpu,
  Bookmark,
  Check,
  RotateCcw,
  Loader2,
  Copy,
  Award,
  Globe,
  ChevronDown,
  Eye,
  UploadCloud,
  FileUp,
} from 'lucide-react';
import { ConversationItem, MessageItem, DocumentItem } from '../types/index.js';
import { api } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import { useLanguage } from '../contexts/LanguageContext.js';
import { DocumentManagerModal } from '../components/documents/DocumentManagerModal.js';
import { DocumentViewerModal } from '../components/documents/DocumentViewerModal.js';
import { MarkdownViewer } from '../components/common/MarkdownViewer.js';
import { ThemeToggle } from '../components/common/ThemeToggle.js';

interface LanguageOption {
  id: string;
  label: string;
  native: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'English', label: 'English', native: 'English', flag: '🇬🇧' },
  { id: 'Hindi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { id: 'Marathi', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { id: 'Tamil', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { id: 'Telugu', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { id: 'Gujarati', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { id: 'Bengali', label: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { id: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { id: 'Malayalam', label: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  { id: 'Urdu', label: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { id: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { id: 'Odia', label: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { id: 'Spanish', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { id: 'French', label: 'French', native: 'Français', flag: '🇫🇷' },
  { id: 'German', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { id: 'auto', label: 'Auto Detect (Defaults to English)', native: 'Auto', flag: '🌐' },
];

interface AiAssistantPageProps {
  initialConversationId?: string;
  initialAttachedDocId?: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const AiAssistantPage: React.FC<AiAssistantPageProps> = ({
  initialConversationId,
  initialAttachedDocId,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { showToast } = useToast();
  const { selectedLanguage, setSelectedLanguage, t } = useLanguage();

  // State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [selectedMarks, setSelectedMarks] = useState<4 | 6 | 8>(6);
  const [openCardLangDropdownMsgId, setOpenCardLangDropdownMsgId] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [regeneratingMsgId, setRegeneratingMsgId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchConvQuery, setSearchConvQuery] = useState('');
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [answerViewFilter, setAnswerViewFilter] = useState<'both' | 'study_material' | 'ai_knowledge'>('both');

  // ChatGPT-style Document Viewer State
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);
  const [viewingPage, setViewingPage] = useState<number>(1);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingDirect, setUploadingDirect] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Modals / Renaming / Editing
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getDocBadgeColor = (type?: string) => {
    const ext = (type || '').toUpperCase();
    if (ext === 'PDF') return 'bg-rose-500/20 text-rose-300 border-rose-400/30';
    if (ext === 'DOCX' || ext === 'DOC') return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
    if (ext === 'PPTX' || ext === 'PPT') return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
  };

  const handleOpenDocViewer = (
    doc: DocumentItem | { _id?: string; originalName: string; fileType?: string },
    page: number = 1
  ) => {
    const fullDoc =
      documents.find((d) => d._id === (doc as any)._id || d.originalName === doc.originalName) ||
      ({
        _id: (doc as any)._id || 'doc',
        originalName: doc.originalName,
        fileType: doc.fileType || 'PDF',
        totalPages: 1,
        status: 'ready',
      } as DocumentItem);
    setViewingDocument(fullDoc);
    setViewingPage(page);
    setIsViewerModalOpen(true);
  };

  const uploadAndAttachFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'pptx', 'txt'].includes(ext || '')) {
      showToast(`Unsupported format (.${ext}). Allowed: PDF, DOCX, PPTX, TXT.`, 'error');
      return;
    }

    try {
      setUploadingDirect(true);
      showToast(`Uploading "${file.name}"... Starting text extraction and vector indexing.`, 'info');
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.uploadDocument(formData);
      if (res.success && res.document) {
        showToast(`"${file.name}" attached! Ready for study questions.`, 'success');
        setSelectedDocument(res.document);
        const docRes = await api.getDocuments();
        if (docRes.success && docRes.documents) setDocuments(docRes.documents);
      }
    } catch (err: any) {
      showToast(err.message || 'Document upload failed.', 'error');
    } finally {
      setUploadingDirect(false);
      setShowAttachMenu(false);
    }
  };

  const handleDirectFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAndAttachFile(file);
    }
    if (directFileInputRef.current) directFileInputRef.current.value = '';
  };

  // Load conversations and documents
  const loadInitialData = async () => {
    try {
      const [convRes, docRes] = await Promise.all([
        api.getConversations(),
        api.getDocuments(),
      ]);

      if (convRes.success && convRes.conversations) {
        setConversations(convRes.conversations);
        if (!activeConversationId && convRes.conversations.length > 0) {
          setActiveConversationId(convRes.conversations[0]._id);
        }
      }

      if (docRes.success && docRes.documents) {
        let loadedDocs = docRes.documents;
        if (loadedDocs.length === 0) {
          try {
            const seedRes = await api.seedSampleDocuments();
            if (seedRes.success && seedRes.documents) {
              loadedDocs = seedRes.documents;
            }
          } catch {}
        }

        setDocuments(loadedDocs);
        if (initialAttachedDocId) {
          const found = loadedDocs.find((d: any) => d._id === initialAttachedDocId);
          if (found) setSelectedDocument(found);
        } else if (loadedDocs.length > 0) {
          const readyDoc = loadedDocs.find((d: any) => d.status === 'ready');
          if (readyDoc) setSelectedDocument(readyDoc);
        }
      }
    } catch (err: any) {
      console.error('Failed to load initial chat data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await api.getConversation(activeConversationId);
        if (res.success && res.messages) {
          setMessages(res.messages);
        }
      } catch (err: any) {
        console.error('Failed to load conversation messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeConversationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, regeneratingMsgId]);

  const handleNewChat = async () => {
    try {
      const res = await api.createConversation('New Study Conversation');
      if (res.success && res.conversation) {
        setConversations((prev) => [res.conversation, ...prev]);
        setActiveConversationId(res.conversation._id);
        setMessages([]);
        showToast('New study conversation created.', 'success');
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create new chat.', 'error');
    }
  };

  const handleRenameConversation = async (id: string) => {
    if (!renameTitle.trim()) {
      setRenamingConvId(null);
      return;
    }
    try {
      const res = await api.updateConversation(id, renameTitle.trim());
      if (res.success) {
        setConversations((prev) =>
          prev.map((c) => (c._id === id ? { ...c, title: renameTitle.trim() } : c))
        );
        showToast('Conversation renamed.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to rename conversation.', 'error');
    } finally {
      setRenamingConvId(null);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await api.deleteConversation(id);
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c._id !== id));
        if (activeConversationId === id) {
          const remaining = conversations.filter((c) => c._id !== id);
          setActiveConversationId(remaining.length > 0 ? remaining[0]._id : null);
        }
        showToast('Conversation deleted.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete conversation.', 'error');
    } finally {
      setConfirmDeleteConvId(null);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuestion.trim() || sending) return;

    const questionText = inputQuestion.trim();
    setInputQuestion('');

    // Optimistic user message with document attachment metadata
    const tempUserMessage: MessageItem = {
      _id: `temp_${Date.now()}`,
      conversationId: activeConversationId || '',
      role: 'user',
      content: questionText,
      language: selectedLanguage,
      documentIds: selectedDocument ? [selectedDocument._id] : [],
      attachedDocumentName: selectedDocument?.originalName,
      attachedDocumentType: selectedDocument?.fileType,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setSending(true);

    try {
      const res = await api.sendMessage({
        conversationId: activeConversationId || undefined,
        question: questionText,
        documentId: selectedDocument?._id,
        marks: selectedMarks,
        language: selectedLanguage,
      });

      if (res.success) {
        if (!activeConversationId && res.conversationId) {
          setActiveConversationId(res.conversationId);
          const convRes = await api.getConversations();
          if (convRes.success) setConversations(convRes.conversations);
        }

        // Replace temporary message with official messages from server
        setMessages((prev) => [
          ...prev.filter((m) => m._id !== tempUserMessage._id),
          res.userMessage,
          res.assistantMessage,
        ]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to get AI response.', 'error');
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMessage._id));
      setInputQuestion(questionText);
    } finally {
      setSending(false);
    }
  };

  const handleSaveEditedQuestion = async (messageId: string) => {
    if (!editingContent.trim() || sending) return;

    const newQuestion = editingContent.trim();
    setEditingMessageId(null);
    setSending(true);

    try {
      const res = await api.editMessage(messageId, {
        newQuestion,
        documentId: selectedDocument?._id,
        marks: selectedMarks,
        language: selectedLanguage,
      });

      if (res.success) {
        showToast('Question updated and exam answer regenerated.', 'success');
        if (activeConversationId) {
          const freshRes = await api.getConversation(activeConversationId);
          if (freshRes.success && freshRes.messages) {
            setMessages(freshRes.messages);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update message.', 'error');
    } finally {
      setSending(false);
    }
  };

  // Regenerate answer or change marks format / language on an assistant message
  const handleRegenerateAnswer = async (
    messageId: string,
    marksToUse?: 4 | 6 | 8,
    languageToUse?: string
  ) => {
    if (regeneratingMsgId || sending) return;
    const marksTarget = marksToUse || selectedMarks;
    const langTarget = languageToUse !== undefined ? languageToUse : selectedLanguage;

    setRegeneratingMsgId(messageId);
    setOpenCardLangDropdownMsgId(null);

    try {
      const langNotice = langTarget === 'auto' ? 'Auto-Detected Language' : langTarget;
      showToast(`Regenerating strictly grounded answer for ${marksTarget} Marks in ${langNotice}...`, 'info');

      const res = await api.regenerateMessage(messageId, {
        marks: marksTarget,
        language: langTarget,
        documentId: selectedDocument?._id,
      });

      if (res.success && res.assistantMessage) {
        setMessages((prev) =>
          prev.map((m) => (m._id === res.assistantMessage._id ? res.assistantMessage : m))
        );
        showToast(`Exam answer updated for ${marksTarget} Marks in ${langNotice}!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate exam answer.', 'error');
    } finally {
      setRegeneratingMsgId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const readyDocumentsCount = documents.filter((d) => d.status === 'ready').length;

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchConvQuery.toLowerCase())
  );

  const getLanguageLabel = (langCode?: string) => {
    if (!langCode || langCode === 'auto') return '🇬🇧 English';
    const found = SUPPORTED_LANGUAGES.find((l) => l.id.toLowerCase() === langCode.toLowerCase());
    return found ? `${found.flag} ${found.label}` : `🌐 ${langCode}`;
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* ======================================================== */}
      {/* LEFT CHAT HISTORY PANEL (~265px)                          */}
      {/* ======================================================== */}
      {!isHistoryCollapsed && (
        <div className="w-[265px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full transition-all duration-200 z-10">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white">
                Chat History
              </span>
            </div>

            <button
              onClick={() => setIsHistoryCollapsed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Study Chat</span>
            </button>
          </div>

          {/* Search Conversations */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchConvQuery}
                onChange={(e) => setSearchConvQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {searchConvQuery ? 'No matching chats' : 'No study chats yet'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv._id === activeConversationId;
                const isRenaming = renamingConvId === conv._id;

                return (
                  <div
                    key={conv._id}
                    onClick={() => {
                      if (!isRenaming) setActiveConversationId(conv._id);
                    }}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />

                    {isRenaming ? (
                      <input
                        type="text"
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onBlur={() => handleRenameConversation(conv._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameConversation(conv._id);
                          if (e.key === 'Escape') setRenamingConvId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-blue-400 text-xs text-slate-900 dark:text-white outline-none"
                      />
                    ) : (
                      <span className="truncate flex-1 text-left">{conv.title}</span>
                    )}

                    {/* Actions: Rename / Delete */}
                    {!isRenaming && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingConvId(conv._id);
                            setRenameTitle(conv.title);
                          }}
                          className="p-1 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                          title="Rename chat"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteConvId(conv._id);
                          }}
                          className="p-1 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteConvId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Delete Conversation?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              This will permanently delete this conversation and all saved exam question answers.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteConvId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConversation(confirmDeleteConvId)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RIGHT CHAT PANEL (ChatGPT Style)                          */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Right Chat Panel Header */}
        <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {isHistoryCollapsed && (
              <button
                onClick={() => setIsHistoryCollapsed(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Expand Chat History"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="truncate flex items-center flex-wrap gap-1.5">
                <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                  EduRAG Assistant
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                  <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>{selectedMarks} Marks Mode</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>{getLanguageLabel(selectedLanguage)}</span>
                </span>
                <span className="text-[11px] text-slate-400 ml-1 font-medium hidden lg:inline">
                  • Online ({readyDocumentsCount} docs)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Selector */}
            <div className="hidden md:flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setAnswerViewFilter('both')}
                className={`px-2 py-1 rounded-lg transition ${
                  answerViewFilter === 'both'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Show both Study Material and AI Knowledge answers"
              >
                Dual View
              </button>
              <button
                type="button"
                onClick={() => setAnswerViewFilter('study_material')}
                className={`px-2 py-1 rounded-lg transition ${
                  answerViewFilter === 'study_material'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Show only Study Material Grounded Answer"
              >
                Study Material
              </button>
              <button
                type="button"
                onClick={() => setAnswerViewFilter('ai_knowledge')}
                className={`px-2 py-1 rounded-lg transition ${
                  answerViewFilter === 'ai_knowledge'
                    ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Show only General AI Knowledge Answer"
              >
                AI Knowledge
              </button>
            </div>

            {/* Manage Study Documents */}
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              title="Open Documents Manager"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Documents</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700">
                {readyDocumentsCount}
              </span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <ThemeToggle size="sm" />

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className={`p-2 rounded-xl text-xs font-medium transition ${
                isFullscreen
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (Hide main sidebar)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Messages Scroll Area with Drag & Drop Attachment */}
        <div
          className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 relative"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) await uploadAndAttachFile(file);
          }}
        >
          {isDragOver && (
            <div className="absolute inset-4 z-40 rounded-3xl border-2 border-dashed border-blue-500 bg-blue-50/90 dark:bg-blue-950/90 flex flex-col items-center justify-center gap-2 pointer-events-none backdrop-blur-xs shadow-2xl">
              <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce" />
              <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                Drop your study document here to attach & chat
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Supports PDF, DOCX, PPTX, TXT
              </p>
            </div>
          )}

          {/* Empty State */}
          {messages.length === 0 && !loadingMessages && (
            <div className="max-w-xl mx-auto my-auto text-center py-10 px-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Multilingual University Exam Assistant
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Ask questions and generate strictly grounded exam answers in <strong>English, Hindi, Marathi, Tamil, Telugu, Gujarati, Bengali</strong>, or any language for <strong>4, 6, or 8 marks</strong>.
              </p>

              {/* Ready docs indicator in empty state */}
              <div className="mt-5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Active Study Material Context
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {readyDocumentsCount} Documents Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDocument ? (
                    <span>
                      Targeting: <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{selectedDocument.originalName}</strong>
                    </span>
                  ) : (
                    'Questions will search all ready study documents in your student account.'
                  )}
                </p>
              </div>

              {/* Example Prompts by Marks & Languages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-left">
                {[
                  { text: 'Explain Machine Learning (ML) and Natural Language Processing (NLP) in 4 marks exam format.', marks: 4, lang: 'English' },
                  { text: 'मशीन लर्निंगचे प्रकार आणि कार्यप्रणाली स्पष्ट करा (6 गुण).', marks: 6, lang: 'Marathi' },
                  { text: 'प्राकृतिक भाषा प्रसंस्करण (NLP) के प्रमुख चरण और आर्किटेक्चर समझाइए (6 अंक).', marks: 6, lang: 'Hindi' },
                  { text: 'Explain RSA encryption algorithm with mathematical formulation and security principles (8 marks).', marks: 8, lang: 'English' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputQuestion(item.text);
                      setSelectedMarks(item.marks as 4 | 6 | 8);
                      if (item.lang) setSelectedLanguage(item.lang);
                      setTimeout(() => textareaRef.current?.focus(), 50);
                    }}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition text-left group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Ask Question:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {item.lang}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {item.marks} Marks
                        </span>
                      </div>
                    </div>
                    <span className="group-hover:text-slate-900 dark:group-hover:text-white line-clamp-2">
                      "{item.text}"
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingMessages && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* Messages Flow */}
          {messages.map((msg) => {
            if (msg.role === 'user') {
              // Resolve student provided document (ChatGPT style)
              const attachedDoc =
                (msg.attachedDocumentName
                  ? documents.find((d) => d.originalName === msg.attachedDocumentName) || {
                      _id: msg.documentIds?.[0] || 'doc',
                      originalName: msg.attachedDocumentName,
                      fileType: msg.attachedDocumentType || 'PDF',
                      status: 'ready',
                    }
                  : null) ||
                (msg.documentIds && msg.documentIds.length > 0
                  ? documents.find((d) => msg.documentIds?.includes(d._id))
                  : null);

              return (
                <div key={msg._id} className="flex justify-end group">
                  <div className="max-w-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-md shadow-blue-500/10 relative">
                    {/* ChatGPT Style Attached Document Card */}
                    {attachedDoc && (
                      <div
                        onClick={() => handleOpenDocViewer(attachedDoc)}
                        className="mb-2.5 p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 transition cursor-pointer flex items-center justify-between gap-3 group/doc text-left"
                        title={`View attached document: ${attachedDoc.originalName}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 border ${getDocBadgeColor(
                              attachedDoc.fileType
                            )}`}
                          >
                            {attachedDoc.fileType?.slice(0, 4) || 'DOC'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                              {attachedDoc.originalName}
                            </p>
                            <p className="text-[10px] text-blue-100 flex items-center gap-1.5 opacity-90">
                              <span className="uppercase font-bold tracking-wider">{attachedDoc.fileType || 'DOC'}</span>
                              <span>•</span>
                              <span>Provided Document</span>
                              <span>•</span>
                              <span className="underline decoration-dotted group-hover/doc:text-white">Click to view</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/20 group-hover/doc:bg-white/30 text-white shrink-0">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </div>
                      </div>
                    )}

                    {editingMessageId === msg._id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full p-2 rounded-xl bg-blue-700/80 text-white text-xs border border-blue-400 focus:outline-none"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="text-[11px] px-2 py-1 bg-blue-800 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditedQuestion(msg._id)}
                            className="text-[11px] px-2 py-1 bg-white text-blue-900 font-bold rounded-lg"
                          >
                            Save & Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-between gap-4 mt-1.5 pt-1 border-t border-white/20 text-[10px] text-blue-100">
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            onClick={() => {
                              setEditingMessageId(msg._id);
                              setEditingContent(msg.content);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-white/90 hover:text-white flex items-center gap-1 transition"
                            title="Edit question & regenerate answers"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Question</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            }

            // ASSISTANT MESSAGE CARD (DUAL OR SINGLE VIEW)
            const showStudyMaterial = answerViewFilter === 'both' || answerViewFilter === 'study_material';
            const showAiKnowledge = answerViewFilter === 'both' || answerViewFilter === 'ai_knowledge';

            const currentMarks = msg.marks || 6;
            const currentLang = msg.language && msg.language !== 'auto' ? msg.language : 'English';
            const isRegeneratingThis = regeneratingMsgId === msg._id;
            const isCardLangMenuOpen = openCardLangDropdownMsgId === msg._id;

            return (
              <div key={msg._id} className="space-y-4 max-w-4xl mx-auto">
                {/* ---------------------------------------------------- */}
                {/* SECTION 1: BASED ON STUDY MATERIAL (Grounded)       */}
                {/* ---------------------------------------------------- */}
                {showStudyMaterial && (
                  <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-5 md:p-6 shadow-sm relative transition">
                    {/* Header with Badges & Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-indigo-50 dark:border-slate-800 mb-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                              Based on Study Material
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase">
                              Grounded ({currentMarks} Marks)
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              {getLanguageLabel(currentLang)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Synthesized from related course concepts & study material • Exam theory format
                          </span>
                        </div>
                      </div>

                      {/* Toolbar: Switch Marks, Switch Language, Regenerate, Copy */}
                      <div className="flex items-center gap-1.5 ml-auto flex-wrap relative">
                        {/* Marks Pill Switcher */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-semibold text-slate-500 px-1.5 hidden sm:inline">Marks:</span>
                          {([4, 6, 8] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              disabled={isRegeneratingThis || sending}
                              onClick={() => handleRegenerateAnswer(msg._id, m, currentLang)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                currentMarks === m
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                              title={`Format answer for ${m} marks`}
                            >
                              {m}M
                            </button>
                          ))}
                        </div>

                        {/* Language Switcher Dropdown on Message Card */}
                        <div className="relative">
                          <button
                            type="button"
                            disabled={isRegeneratingThis || sending}
                            onClick={() => setOpenCardLangDropdownMsgId(isCardLangMenuOpen ? null : msg._id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                            title="Change answer language & regenerate"
                          >
                            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="max-w-[80px] sm:max-w-[110px] truncate">{currentLang}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>

                          {/* Language Menu Popover */}
                          {isCardLangMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-56 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-40 space-y-0.5">
                              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Switch Output Language:
                              </div>
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <button
                                  key={lang.id}
                                  type="button"
                                  onClick={() => {
                                    setOpenCardLangDropdownMsgId(null);
                                    setSelectedLanguage(lang.id);
                                    handleRegenerateAnswer(msg._id, currentMarks as 4 | 6 | 8, lang.id);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-left transition ${
                                    currentLang.toLowerCase() === lang.id.toLowerCase()
                                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span>{lang.flag}</span>
                                    <span>{lang.label}</span>
                                  </span>
                                  {currentLang.toLowerCase() === lang.id.toLowerCase() && (
                                    <Check className="w-3.5 h-3.5 text-blue-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Regenerate Button */}
                        <button
                          type="button"
                          disabled={isRegeneratingThis || sending}
                          onClick={() => handleRegenerateAnswer(msg._id, currentMarks as 4 | 6 | 8, currentLang)}
                          className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium transition"
                          title="Regenerate this exam answer"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isRegeneratingThis ? 'animate-spin text-indigo-600' : ''}`} />
                          <span className="hidden sm:inline">Regenerate</span>
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.studyMaterialAnswer || msg.content);
                            showToast(`Copied ${currentMarks} marks answer to clipboard!`, 'success');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium transition"
                          title="Copy Study Material answer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Regeneration Loading State */}
                    {isRegeneratingThis && (
                      <div className="mb-4 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3 animate-pulse">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                        <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                          Retrieving study material & synthesizing {currentMarks} marks university answer ({currentLang || 'English'})...
                        </span>
                      </div>
                    )}

                    {/* Grounded Content with Structured Markdown */}
                    <MarkdownViewer
                      content={msg.studyMaterialAnswer || msg.content}
                      className="text-xs md:text-sm leading-relaxed text-slate-800 dark:text-slate-200"
                    />

                    {/* Verified Source Document Names & Page References */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-indigo-50 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Source Document & Verified Page References:</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, sIdx) => {
                            const matchingDoc = documents.find((d) => d.originalName === src.filename);
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() =>
                                  handleOpenDocViewer(
                                    matchingDoc || {
                                      _id: src.documentId || 'source',
                                      originalName: src.filename,
                                      fileType: src.filename.split('.').pop()?.toUpperCase() || 'TXT',
                                    },
                                    src.pageNumber
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/90 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-300 text-xs shadow-2xs transition cursor-pointer group"
                                title={`Click to view ${src.filename} on Page ${src.pageNumber}`}
                              >
                                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition" />
                                <span className="font-semibold truncate max-w-[180px] sm:max-w-[220px]">
                                  {src.filename}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 font-bold text-[10px] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                  Page {src.pageNumber}
                                </span>
                                <Eye className="w-3 h-3 text-indigo-500 opacity-60 group-hover:opacity-100 transition ml-0.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* SECTION 2: BASED ON AI — FINAL ANSWER (General Knowledge) */}
                {/* ---------------------------------------------------- */}
                {showAiKnowledge && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm relative">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                              Based on AI — Final Answer
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 uppercase">
                              AI Knowledge ({currentMarks} Marks)
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              {getLanguageLabel(currentLang)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Comprehensive academic theory synthesis formatted for {currentMarks} marks examination
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.generalAiAnswer || '');
                            showToast(`Copied ${currentMarks} marks AI answer to clipboard!`, 'success');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium transition"
                          title="Copy AI Knowledge answer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* AI General Knowledge with Structured Markdown */}
                    <MarkdownViewer
                      content={msg.generalAiAnswer || 'Synthesis completed.'}
                      className="text-xs md:text-sm leading-relaxed text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Sending / Vectorizing Indicator */}
          {sending && (
            <div className="max-w-md p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-md flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold">
                  Retrieving chunks & synthesizing {selectedMarks} marks exam answer ({selectedLanguage && selectedLanguage !== 'auto' ? selectedLanguage : 'English'})...
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Strictly grounded study material retrieval + multilingual exam formatting
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ======================================================== */}
        {/* BOTTOM FIXED CHAT INPUT WITH EXAM MARKS & LANGUAGE SELECTOR */}
        {/* ======================================================== */}
        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 md:px-8">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Top Toolbar: Document Selector, Language Selector & Exam Marks (4, 6, 8 marks) */}
            <div className="flex items-center justify-between gap-2 text-xs px-1 flex-wrap">
              {/* Document Indicator */}
              <div className="flex items-center gap-2 min-w-0">
                {selectedDocument ? (
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate max-w-[180px] sm:max-w-xs">
                      {selectedDocument.originalName}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded">
                      Ready
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenDocViewer(selectedDocument)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 ml-1"
                      title="Preview this document"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDocument(null)}
                      className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded-full transition ml-0.5"
                      title="Remove attachment (Search all documents)"
                    >
                      <X className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate">
                      All ready documents in student account
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-1"
                >
                  {selectedDocument ? 'Switch Doc' : 'Select Doc'}
                </button>
              </div>

              {/* Exam Marks Selector (4, 6, 8 Marks) */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Marks:</span>
                </span>
                {([4, 6, 8] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMarks(m)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition ${
                      selectedMarks === m
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={`Generate answer formatted for ${m} marks`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>

            {/* ChatGPT-style Attached Document Banner above textarea */}
            {selectedDocument && (
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/90 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 border ${getDocBadgeColor(
                      selectedDocument.fileType
                    )}`}
                  >
                    {selectedDocument.fileType?.slice(0, 4) || 'DOC'}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                      {selectedDocument.originalName}
                    </p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span className="uppercase font-semibold">{selectedDocument.fileType} Document</span>
                      <span>•</span>
                      <span>Attached to upcoming exam query</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenDocViewer(selectedDocument)}
                    className="px-2 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 border border-indigo-200 dark:border-slate-700 transition"
                    title="View document text and formulas"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Doc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDocument(null)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    title="Remove attachment (Search all documents)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Bar Form */}
            <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-2 shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
              {/* Paperclip Button with Dropdown Menu */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu((prev) => !prev)}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                  title="Attach or upload document"
                >
                  {uploadingDirect ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </button>

                {showAttachMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-30 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        directFileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition text-left cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div>Upload Document</div>
                        <div className="text-[10px] text-slate-400 font-normal">PDF, DOCX, PPTX, TXT</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setIsDocModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition text-left cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div>Study Notes Library</div>
                        <div className="text-[10px] text-slate-400 font-normal">Select uploaded material</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden Direct File Upload Input */}
              <input
                type="file"
                ref={directFileInputRef}
                onChange={handleDirectFileInputChange}
                accept=".pdf,.docx,.pptx,.txt"
                className="hidden"
              />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask question for ${selectedMarks} marks... (${selectedLanguage && selectedLanguage !== 'auto' ? selectedLanguage : 'English'})`}
                rows={1}
                className="flex-1 max-h-32 min-h-[40px] bg-transparent border-none text-xs md:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none py-2 px-1"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputQuestion.trim() || sending}
                className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 shadow-xs transition shrink-0"
                title={`Generate ${selectedMarks} marks answer`}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Document Manager Modal */}
      <DocumentManagerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        selectedDocId={selectedDocument?._id}
        onSelectDocument={(doc) => {
          setSelectedDocument(doc);
          showToast(`Attached "${doc.originalName}" to your search context.`, 'info');
        }}
        onDocumentsUpdated={async () => {
          const res = await api.getDocuments();
          if (res.success && res.documents) setDocuments(res.documents);
        }}
      />

      {/* ChatGPT-style Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isViewerModalOpen}
        onClose={() => setIsViewerModalOpen(false)}
        document={viewingDocument}
        initialPage={viewingPage}
        onSelectForChat={(doc) => {
          setSelectedDocument(doc);
          showToast(`Attached "${doc.originalName}" to chat context.`, 'info');
        }}
      />
    </div>
  );
};
