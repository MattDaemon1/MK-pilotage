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
  Terminal
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  counts
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

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
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
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
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

      {/* Bottom status badge */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1.5 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px]">
          <span>Stockage</span>
          <span className="font-mono text-slate-300">SQLite Local</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span>Mode</span>
          <span className="text-emerald-400 font-medium">Monoposte Windows / Web</span>
        </div>
      </div>
    </aside>
  );
};
