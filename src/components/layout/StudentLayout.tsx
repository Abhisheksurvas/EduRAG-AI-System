import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar.js';
import { Navbar } from './Navbar.js';
import { GlobalSearchModal } from '../common/GlobalSearchModal.js';
import { MongoStatusModal } from '../common/MongoStatusModal.js';
import { api } from '../../services/api.js';

interface StudentLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string, state?: any) => void;
  title: string;
  subtitle?: string;
  isFullscreen?: boolean; // When in AI Assistant fullscreen mode, hides only the main sidebar!
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  title,
  subtitle,
  isFullscreen = false,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mongoConnected, setMongoConnected] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // ignore
    }
  };

  const fetchMongoHealth = async () => {
    try {
      const res = await api.getHealth();
      setMongoConnected(Boolean(res.database?.connected));
    } catch {
      setMongoConnected(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchMongoHealth();

    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchMongoHealth();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Main Student Sidebar: hidden if fullscreen mode is activated */}
      {!isFullscreen && (
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          unreadCount={unreadCount}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenMongoModal={() => setIsMongoModalOpen(true)}
        />
      )}

      {/* Main Right Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          title={title}
          subtitle={subtitle}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenMongoModal={() => setIsMongoModalOpen(true)}
          onNavigate={onNavigate}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          unreadCount={unreadCount}
          mongoConnected={mongoConnected}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto relative flex flex-col">
          {children}
        </main>
      </div>

      {/* Interactive Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Interactive MongoDB Atlas Status & Config Modal */}
      <MongoStatusModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
        onStatusChange={(connected) => setMongoConnected(connected)}
      />
    </div>
  );
};
