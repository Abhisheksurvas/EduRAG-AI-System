import React from 'react';
import {
  LayoutDashboard,
  BotMessageSquare,
  BookOpenCheck,
  HelpCircle,
  Bell,
  User,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { ThemeToggle } from '../common/ThemeToggle.js';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unreadCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenMongoModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  unreadCount = 0,
  isOpenMobile = false,
  onCloseMobile,
  onOpenMongoModal,
}) => {
  const { student, logout } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    {
      name: t('nav.dashboard', 'Dashboard'),
      path: '/student-dashboard',
      icon: LayoutDashboard,
    },
    {
      name: t('nav.aiAssistant', 'AI Study Assistant (RAG)'),
      path: '/student-dashboard/ai-assistant',
      icon: BotMessageSquare,
      badge: 'RAG',
    },
    {
      name: t('nav.notes', 'Notes Generator'),
      path: '/student-dashboard/notes',
      icon: BookOpenCheck,
    },
    {
      name: t('nav.quiz', 'Quiz Center'),
      path: '/student-dashboard/quiz-center',
      icon: HelpCircle,
    },
    {
      name: t('nav.notifications', 'Notifications'),
      path: '/student-dashboard/notifications',
      icon: Bell,
      count: unreadCount,
    },
    {
      name: t('nav.profile', 'Profile'),
      path: '/student-dashboard/profile',
      icon: User,
    },
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const sidebarContent = (
    <div
      className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
        isCollapsed ? 'w-[78px]' : 'w-[250px]'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80">
        <div
          onClick={() => handleNavClick('/student-dashboard')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                EduRAG <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold">AI</span>
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Student Portal
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              title={isCollapsed ? item.name : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform ${
                  isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:scale-110'
                }`}
              />

              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.name}</span>
              )}

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {!isCollapsed && typeof item.count === 'number' && item.count > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                  {item.count}
                </span>
              )}

              {/* Indicator dot when collapsed */}
              {isCollapsed && typeof item.count === 'number' && item.count > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </button>
          );
        })}
      </div>

      {/* Database Status Button */}
      {onOpenMongoModal && (
        <div className="px-3 py-1">
          <button
            onClick={onOpenMongoModal}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="MongoDB Atlas Database Settings"
          >
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {!isCollapsed && <span>MongoDB Atlas</span>}
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-slate-100 dark:border-slate-800" />

      {/* Theme Toggle & Logout */}
      <div className="px-3 pb-2 space-y-1.5">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!isCollapsed && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Theme Mode
            </span>
          )}
          <ThemeToggle size="sm" showLabel={!isCollapsed} />
        </div>

        <button
          onClick={logout}
          title={isCollapsed ? t('nav.signOut', 'Logout') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>{t('nav.signOut', 'Logout')}</span>}
        </button>
      </div>

      {/* Bottom Profile Card */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div
          onClick={() => handleNavClick('/student-dashboard/profile')}
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
            {student?.avatar ? (
              <img src={student.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(student?.name)
            )}
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {student?.name || 'Student'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Roll: {student?.rollNo || 'Not set'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex shrink-0 z-30 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-[270px] max-w-[80vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
