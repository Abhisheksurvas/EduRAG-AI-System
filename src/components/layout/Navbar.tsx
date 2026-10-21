import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Moon,
  Sun,
  Bell,
  Menu,
  Database,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  X,
  Trash2,
  CheckCheck,
  FileText,
  HelpCircle,
  BookOpenCheck,
  Clock,
  Loader2,
  Globe,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import { useToast } from '../../contexts/ToastContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { ThemeToggle } from '../common/ThemeToggle.js';
import { api } from '../../services/api.js';
import { NotificationItem } from '../../types/index.js';

interface NavbarProps {
  title: string;
  subtitle?: string;
  onOpenSearch: () => void;
  onOpenMongoModal: () => void;
  onNavigate: (path: string) => void;
  onToggleMobileMenu: () => void;
  unreadCount?: number;
  mongoConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  subtitle,
  onOpenSearch,
  onOpenMongoModal,
  onNavigate,
  onToggleMobileMenu,
  unreadCount = 0,
  mongoConnected = false,
}) => {
  const { student, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { selectedLanguage, setSelectedLanguage, currentOption, supportedLanguages, t } = useLanguage();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Language Dropdown State
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [customLangInput, setCustomLangInput] = useState('');
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Notification Dropdown State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (name?: string) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  useEffect(() => {
    setLocalUnreadCount(unreadCount);
  }, [unreadCount]);

  const fetchNotifs = async () => {
    try {
      setLoadingNotifs(true);
      const res = await api.getNotifications();
      if (res.success && res.notifications) {
        setNotifs(res.notifications);
        if (typeof res.unreadCount === 'number') {
          setLocalUnreadCount(res.unreadCount);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications in navbar:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleToggleNotif = () => {
    if (!isNotifOpen) {
      fetchNotifs();
    }
    setIsNotifOpen((prev) => !prev);
  };

  const handleClearAllNotifs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.deleteAllNotifications();
      if (res.success) {
        setNotifs([]);
        setLocalUnreadCount(0);
        showToast('All notifications cleared.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clear notifications.', 'error');
    }
  };

  const handleDeleteSingleNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await api.deleteNotification(id);
      if (res.success) {
        const target = notifs.find((n) => n._id === id);
        setNotifs((prev) => prev.filter((n) => n._id !== id));
        if (target && !target.read) {
          setLocalUnreadCount((c) => Math.max(0, c - 1));
        }
        showToast('Notification removed.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove notification.', 'error');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await api.markNotificationRead(id);
      if (res.success) {
        setNotifs((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
        setLocalUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.markAllNotificationsRead();
      if (res.success) {
        setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
        setLocalUnreadCount(0);
        showToast('All marked as read.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to mark notifications read.', 'error');
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-500" />;
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case 'notes':
        return <BookOpenCheck className="w-3.5 h-3.5 text-violet-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left Title Section & Mobile Menu Button */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center / Global Search Trigger */}
      <div className="flex-1 max-w-md mx-2 hidden lg:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 text-xs transition shadow-xs group"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition" />
            <span className="truncate">{t('nav.searchPlaceholder', 'Search courses, notes, quizzes...')}</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Mobile Search Icon */}
        <button
          onClick={onOpenSearch}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* MongoDB Atlas Status Pill */}
        <button
          onClick={onOpenMongoModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
            mongoConnected
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
          }`}
          title="MongoDB Atlas Database Status"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              mongoConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {mongoConnected ? t('nav.mongoConnected', 'MongoDB Atlas') : t('nav.mongoConfig', 'Mongo Config')}
          </span>
        </button>

        {/* Dark/Light Mode Toggle */}
        <ThemeToggle />

        {/* Language Selector in Navbar */}
        <div className="relative" ref={langDropdownRef}>
          <button
            type="button"
            onClick={() => setIsLangOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer text-xs font-semibold ${
              isLangOpen
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs'
            }`}
            title={t('nav.selectLanguage', 'Select Language')}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="flex items-center gap-1 max-w-[85px] sm:max-w-[130px] truncate">
              {currentOption.id === 'auto' ? (
                <>
                  <span className="truncate">{t('nav.language', 'Language')}</span>
                  <span className="px-1 py-0.2 bg-slate-100 dark:bg-slate-700 text-[10px] rounded text-slate-500 dark:text-slate-400 font-mono">
                    Auto
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs">{currentOption.flag}</span>
                  <span className="truncate">{currentOption.native || currentOption.label}</span>
                </>
              )}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${
                isLangOpen ? 'rotate-180 text-indigo-500' : ''
              }`}
            />
          </button>

          {/* Language Dropdown Menu */}
          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {t('nav.selectLanguage', 'Select Language')}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {t('assistant.changeLanguage', 'Changes whole UI & AI answers')}
                    </p>
                  </div>
                </div>
                {selectedLanguage !== 'English' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLanguage('English');
                      showToast('Language reset to English (Default)', 'info');
                      setIsLangOpen(false);
                    }}
                    className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Reset English
                  </button>
                )}
              </div>

              {/* Language Search */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search languages..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Languages List */}
              <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-slate-50 dark:divide-slate-700/30">
                {supportedLanguages
                  .filter(
                    (l) =>
                      l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
                      l.native.toLowerCase().includes(langSearch.toLowerCase()) ||
                      l.id.toLowerCase().includes(langSearch.toLowerCase())
                  )
                  .map((lang) => {
                    const isSelected = selectedLanguage.toLowerCase() === lang.id.toLowerCase();
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => {
                          setSelectedLanguage(lang.id);
                          showToast(`Selected language: ${lang.label} (${lang.native})`, 'success');
                          setIsLangOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm shrink-0">{lang.flag}</span>
                          <div>
                            <span className="block leading-snug">{lang.label}</span>
                            {lang.native !== lang.label && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {lang.native}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>

              {/* Custom Language input */}
              <div className="p-2.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('nav.customLanguage', 'Any other language supported by Gemini:')}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customLangInput.trim()) {
                      setSelectedLanguage(customLangInput.trim());
                      showToast(`Output set to: ${customLangInput.trim()}`, 'success');
                      setCustomLangInput('');
                      setIsLangOpen(false);
                    }
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    value={customLangInput}
                    onChange={(e) => setCustomLangInput(e.target.value)}
                    placeholder={t('nav.customPlaceholder', 'e.g. Sanskrit, Japanese...')}
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!customLangInput.trim()}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    {t('nav.apply', 'Apply')}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={handleToggleNotif}
            className={`relative p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ${
              isNotifOpen ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : ''
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {localUnreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white leading-none">
                {localUnreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Menu */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/90">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {t('nav.allNotifications', 'Notifications')} {notifs.length > 0 && `(${notifs.length})`}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {localUnreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3 h-3 text-emerald-500" />
                      <span>{t('nav.readAll', 'Read all')}</span>
                    </button>
                  )}

                  {notifs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllNotifs}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
                      title="Clear all notifications"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t('nav.clearAll', 'Clear All')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                {loadingNotifs ? (
                  <div className="py-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mx-auto mb-1" />
                    <p className="text-[11px] text-slate-400">Loading notifications...</p>
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="py-10 text-center px-4 space-y-1">
                    <Bell className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('nav.noNotifications', 'No notifications')}
                    </p>
                    <p className="text-[11px] text-slate-400">{t('nav.allCaughtUp', "You're all caught up!")}</p>
                  </div>
                ) : (
                  notifs.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => !item.read && handleMarkAsRead(item._id)}
                      className={`p-3 transition flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 relative group ${
                        item.read
                          ? 'opacity-85'
                          : 'bg-indigo-50/30 dark:bg-indigo-950/20'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                        {getNotifIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-tight">
                          {item.message}
                        </p>

                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(item.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Separate Cross (X) icon to remove this notification */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingleNotif(e, item._id)}
                        className="absolute right-2 top-2 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                        title="Remove notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(false);
                    onNavigate('/student-dashboard/notifications');
                  }}
                  className="w-full py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                >
                  {t('nav.viewAllNotifications', 'View all in Notifications page →')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student Avatar & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {student?.avatar ? (
                <img src={student.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(student?.name)
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {student?.name || 'Student'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {student?.email}
                </p>
                <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Roll: {student?.rollNo || 'Not specified'}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onNavigate('/student-dashboard/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  {t('nav.profile', 'Student Profile')}
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onNavigate('/student-dashboard/ai-assistant');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  {t('nav.aiAssistant', 'AI Study Assistant (RAG)')}
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenMongoModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <Database className="w-4 h-4 text-emerald-500" />
                  MongoDB Settings
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700/60 pt-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.signOut', 'Sign Out')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
