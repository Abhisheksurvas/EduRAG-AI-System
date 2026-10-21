import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { ToastProvider } from './contexts/ToastContext.js';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext.js';
import { StudentLayout } from './components/layout/StudentLayout.js';

// Pages
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { AiAssistantPage } from './pages/AiAssistantPage.js';
import { NotesPage } from './pages/NotesPage.js';
import { QuizCenterPage } from './pages/QuizCenterPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  // Navigation path state with browser history sync
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname === '/' || window.location.pathname === ''
      ? '/login'
      : window.location.pathname;
  });

  const [navigationState, setNavigationState] = useState<any>({});
  const [isAssistantFullscreen, setIsAssistantFullscreen] = useState(false);

  // Sync with browser popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string, state?: any) => {
    window.history.pushState(state || {}, '', path);
    setCurrentPath(path);
    setNavigationState(state || {});
  };

  // Redirect if not authenticated or if authenticated trying to visit login/register
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !['/login', '/register'].includes(currentPath)) {
        navigate('/login');
      } else if (isAuthenticated && ['/login', '/register'].includes(currentPath)) {
        navigate('/student-dashboard');
      }
    }
  }, [isAuthenticated, isLoading, currentPath]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3">
          Initializing EduRAG AI Student Portal...
        </p>
      </div>
    );
  }

  // Public Auth Pages
  if (!isAuthenticated) {
    if (currentPath === '/register') {
      return <RegisterPage onNavigate={navigate} />;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  // Page title mapping
  const getPageMeta = (path: string) => {
    switch (path) {
      case '/student-dashboard/ai-assistant':
        return {
          title: t('title.aiAssistant', 'AI Study Assistant'),
          subtitle: t('subtitle.aiAssistant', 'Multilingual RAG exam answers for 4, 6 & 8 marks strictly based on uploaded materials.'),
        };
      case '/student-dashboard/notes':
        return {
          title: t('title.notes', 'Notes Generator'),
          subtitle: t('subtitle.notes', 'Synthesize flashcards, takeaways, and revision guides from your materials.'),
        };
      case '/student-dashboard/quiz-center':
        return {
          title: t('title.quiz', 'Quiz Center'),
          subtitle: t('subtitle.quiz', 'Generate and take dynamic MCQs verified against your study documents.'),
        };
      case '/student-dashboard/notifications':
        return {
          title: t('title.notifications', 'Notifications'),
          subtitle: t('subtitle.notifications', 'Live system alerts, document readiness, and quiz completion updates.'),
        };
      case '/student-dashboard/profile':
        return {
          title: t('title.profile', 'Student Profile'),
          subtitle: t('subtitle.profile', 'Manage your academic details, branch specialization, and study goals.'),
        };
      case '/student-dashboard':
      default:
        return {
          title: t('title.dashboard', 'Student Dashboard'),
          subtitle: t('subtitle.dashboard', 'Overview of uploaded materials, generated notes, and RAG chats.'),
        };
    }
  };

  const { title, subtitle } = getPageMeta(currentPath);

  return (
    <StudentLayout
      currentPath={currentPath}
      onNavigate={navigate}
      title={title}
      subtitle={subtitle}
      isFullscreen={isAssistantFullscreen && currentPath === '/student-dashboard/ai-assistant'}
    >
      {currentPath === '/student-dashboard' && (
        <DashboardPage onNavigate={navigate} />
      )}

      {currentPath === '/student-dashboard/ai-assistant' && (
        <AiAssistantPage
          initialConversationId={navigationState?.conversationId}
          initialAttachedDocId={navigationState?.attachedDocId}
          isFullscreen={isAssistantFullscreen}
          onToggleFullscreen={() => setIsAssistantFullscreen((prev) => !prev)}
        />
      )}

      {currentPath === '/student-dashboard/notes' && <NotesPage />}

      {currentPath === '/student-dashboard/quiz-center' && <QuizCenterPage />}

      {currentPath === '/student-dashboard/notifications' && <NotificationsPage />}

      {currentPath === '/student-dashboard/profile' && <ProfilePage />}
    </StudentLayout>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
