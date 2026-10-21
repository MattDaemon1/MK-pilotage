import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Briefcase,
  FileCheck2,
  ReceiptEuro,
  CheckSquare,
  Search,
  Settings,
  Terminal,
  X,
  LogOut
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'contacts'
  | 'activities'
  | 'missions'
  | 'contracts'
  | 'finances'
  | 'tasks'
  | 'search'
  | 'settings'
  | 'python';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  counts?: {
    overdueTasks?: number;
    pendingQuotes?: number;
    renewingContracts?: number;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  currentUser?: string | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  counts,
  isMobileOpen,
  onCloseMobile,
  currentUser,
  onLogout
}) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'contacts', label: 'Contacts & Clients', icon: <Users className="w-4 h-4" /> },
    { id: 'activities', label: 'Journal de travail', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'missions', label: 'Missions & Projets', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'contracts', label: 'Contrats récurrents', icon: <FileCheck2 className="w-4 h-4" />, badge: counts?.renewingContracts },
    { id: 'finances', label: 'Devis & Factures', icon: <ReceiptEuro className="w-4 h-4" />, badge: counts?.pendingQuotes },
    { id: 'tasks', label: 'Tâches & Relances', icon: <CheckSquare className="w-4 h-4" />, badge: counts?.overdueTasks },
    { id: 'search', label: 'Recherche globale', icon: <Search className="w-4 h-4" /> },
    { id: 'settings', label: 'Sauvegardes & Données', icon: <Settings className="w-4 h-4" /> },
    { id: 'python', label: 'Code Python & Windows', icon: <Terminal className="w-4 h-4" /> },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <>
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-inner">
            MK
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight leading-tight">
              Matt Konnect
            </h1>
            <p className="text-[11px] text-slate-400 font-normal">
              Pilotage & CRM Solo
            </p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            title="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Modules de gestion
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 sm:py-2 text-xs font-medium rounded-lg transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/90 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
            {currentUser ? currentUser.substring(0, 1).toUpperCase() : 'M'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {currentUser || 'Matt'}
            </p>
            <p className="text-[10px] text-emerald-400 font-normal">Connecté</p>
          </div>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom status badge */}
      <div className="p-3.5 border-t border-slate-800/80 text-xs text-slate-400 space-y-1.5 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px]">
          <span>Stockage</span>
          <span className="font-mono text-slate-300">SQLite Local</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span>Mode</span>
          <span className="text-emerald-400 font-medium">Monoposte Windows / Web</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 shrink-0 bg-slate-900 text-slate-300 flex-col h-screen border-r border-slate-800 select-none">
        {navContent}
      </aside>

      {/* Mobile Drawer (visible only on mobile when opened) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer panel */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col z-50 shadow-2xl border-r border-slate-800 select-none animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
