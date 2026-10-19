import React from 'react';
import { PlusCircle, Search, Menu } from 'lucide-react';
import { ActiveTab } from './Sidebar.tsx';

interface TopBarProps {
  activeTab: ActiveTab;
  onOpenQuickLog: () => void;
  onOpenSearch: () => void;
  clientDetailName?: string | null;
  onToggleMobileMenu?: () => void;
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
  clientDetailName,
  onToggleMobileMenu
}) => {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2 sm:gap-4 z-10">
      {/* Zone 1: Mobile Hamburger + Context title & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-800 font-semibold min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
            title="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="hidden sm:inline">Matt Konnect</span>
        <span className="hidden sm:inline text-slate-300">/</span>
        <span className="text-slate-600 font-normal truncate">
          {clientDetailName ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="hidden sm:inline">Contacts</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="text-slate-900 font-semibold truncate">{clientDetailName}</span>
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
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left cursor-pointer"
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

      {/* Zone 3: Mobile search icon + Primary action button */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
          title="Rechercher"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenQuickLog}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          title="Consigner rapidement une action ou intervention technique (raccourci : N)"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Consigner mon travail</span>
          <span className="sm:hidden">Consigner</span>
        </button>
      </div>
    </header>
  );
};
