import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { QuickLogModal } from './components/QuickLogModal.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { ContactsView } from './views/ContactsView.tsx';
import { ContactDetailView } from './views/ContactDetailView.tsx';
import { ActivitiesView } from './views/ActivitiesView.tsx';
import { MissionsView } from './views/MissionsView.tsx';
import { ContractsView } from './views/ContractsView.tsx';
import { FinancesView } from './views/FinancesView.tsx';
import { TasksView } from './views/TasksView.tsx';
import { GlobalSearchView } from './views/GlobalSearchView.tsx';
import { SettingsBackupView } from './views/SettingsBackupView.tsx';
import { PythonLocalView } from './views/PythonLocalView.tsx';
import { LoginView } from './views/LoginView.tsx';
import { api } from './services/api.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('mk_auth_user');
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Quick log modal
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [quickLogContactId, setQuickLogContactId] = useState<number | undefined>(undefined);
  const [quickLogMissionId, setQuickLogMissionId] = useState<number | undefined>(undefined);

  // Counts for sidebar badges
  const [badgeCounts, setBadgeCounts] = useState({
    overdueTasks: 0,
    pendingQuotes: 0,
    renewingContracts: 0
  });

  // Contact name for top bar breadcrumb when in detail view
  const [currentContactName, setCurrentContactName] = useState<string | null>(null);

  // Key refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  const loadBadgeCounts = async () => {
    try {
      const data = await api.getDashboard();
      setBadgeCounts({
        overdueTasks: data.overdue_tasks,
        pendingQuotes: data.pending_quotes,
        renewingContracts: data.renewing_contracts_count
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadBadgeCounts();
  }, [refreshKey]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is inside an input or textarea, ignore
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openQuickLog();
      } else if (e.key === '/') {
        e.preventDefault();
        setActiveTab('search');
        setSelectedContactId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openQuickLog = (contactId?: number, missionId?: number) => {
    setQuickLogContactId(contactId);
    setQuickLogMissionId(missionId);
    setIsQuickLogOpen(true);
  };

  const handleQuickLogSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedContactId(null);
    setCurrentContactName(null);
  };

  const handleSelectContact = async (id: number) => {
    setSelectedContactId(id);
    setActiveTab('contacts');
    try {
      const detail = await api.getContact(id);
      setCurrentContactName(detail.contact.contact_name);
    } catch {
      setCurrentContactName(`Contact #${id}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mk_auth_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Sidebar Navigation (Desktop sidebar + Mobile drawer) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={badgeCounts}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TopBar with brand wordmark, contextual breadcrumb, and "Consigner mon travail" CTA */}
        <TopBar
          activeTab={activeTab}
          onOpenQuickLog={() => openQuickLog()}
          onOpenSearch={() => {
            setActiveTab('search');
            setSelectedContactId(null);
          }}
          clientDetailName={selectedContactId ? currentContactName : null}
          onToggleMobileMenu={() => setIsMobileDrawerOpen((v) => !v)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Viewport Content with padding-bottom for mobile bottom navigation */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              key={refreshKey}
              onNavigate={(tab) => handleTabChange(tab)}
              onOpenQuickLog={openQuickLog}
              onSelectContact={handleSelectContact}
            />
          )}

          {activeTab === 'contacts' && (
            selectedContactId ? (
              <ContactDetailView
                key={`${selectedContactId}-${refreshKey}`}
                contactId={selectedContactId}
                onBack={() => {
                  setSelectedContactId(null);
                  setCurrentContactName(null);
                }}
                onOpenQuickLog={openQuickLog}
                onNavigateToMissions={() => handleTabChange('missions')}
              />
            ) : (
              <ContactsView
                key={refreshKey}
                onSelectContact={handleSelectContact}
                onOpenQuickLogForContact={(cid) => openQuickLog(cid)}
              />
            )
          )}

          {activeTab === 'activities' && (
            <ActivitiesView
              key={refreshKey}
              onOpenQuickLog={() => openQuickLog()}
              onSelectContact={handleSelectContact}
            />
          )}

          {activeTab === 'missions' && (
            <MissionsView
              key={refreshKey}
              onSelectContact={handleSelectContact}
              onOpenQuickLogForMission={(cid, mid) => openQuickLog(cid, mid)}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractsView
              key={refreshKey}
              onSelectContact={handleSelectContact}
            />
          )}

          {activeTab === 'finances' && (
            <FinancesView
              key={refreshKey}
              onSelectContact={handleSelectContact}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              key={refreshKey}
              onSelectContact={handleSelectContact}
            />
          )}

          {activeTab === 'search' && (
            <GlobalSearchView
              onSelectContact={handleSelectContact}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsBackupView />
          )}

          {activeTab === 'python' && (
            <PythonLocalView />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (hidden on desktop) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
        badgeCounts={badgeCounts}
      />

      {/* Lightning-Fast Work Logger Modal */}
      <QuickLogModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        onSuccess={handleQuickLogSuccess}
        initialContactId={quickLogContactId}
        initialMissionId={quickLogMissionId}
      />
    </div>
  );
}
