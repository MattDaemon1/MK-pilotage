import React from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { ActiveTab } from './Sidebar.tsx';

interface TopBarProps {
  activeTab: ActiveTab;
  onOpenQuickLog: () => void;
  onOpenSearch: () => void;
  clientDetailName?: string | null;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Tableau de bord',
  contacts: 'Contacts & Clients',
  activities: 'Journal de travail',
  missions: 'Missions & Projets',
  contracts: 'Contrats récurrents',
  finances: 'Devis & Factures',
  tasks: 'Tâches & Relances',
  search: 'Recherche globale',
  settings: 'Sauvegardes & Données',
  python: 'Code Python & Windows',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenQuickLog,
  onOpenSearch,
  clientDetailName
}) => {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 gap-4">
      {/* Zone 1: Context title & Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-800 font-semibold whitespace-nowrap">
        <span>Matt Konnect</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600 font-normal">
          {clientDetailName ? (
            <span className="flex items-center gap-1.5">
              <span>Contacts</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold">{clientDetailName}</span>
            </span>
          ) : (
            TAB_TITLES[activeTab]
          )}
        </span>
      </div>

      {/* Zone 2: Search quick button */}
      <div className="flex-1 max-w-xs hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Rechercher client, mission, devis...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded">
            /
          </kbd>
        </button>
      </div>

      {/* Zone 3: Primary action button: Consigner mon travail */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenQuickLog}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
          title="Consigner rapidement une action ou intervention technique (raccourci : N)"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Consigner mon travail</span>
        </button>
      </div>
    </header>
  );
};
