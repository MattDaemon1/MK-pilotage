import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ReceiptEuro,
  Menu
} from 'lucide-react';
import { ActiveTab } from './Sidebar.tsx';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenDrawer: () => void;
  badgeCounts?: {
    overdueTasks?: number;
    pendingQuotes?: number;
    renewingContracts?: number;
  };
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenDrawer,
  badgeCounts
}) => {
  const isMenuTab = ['missions', 'contracts', 'tasks', 'search', 'settings', 'python'].includes(activeTab);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center justify-around px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] select-none">
      <button
        onClick={() => onTabChange('dashboard')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
          activeTab === 'dashboard' ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Tableau</span>
      </button>

      <button
        onClick={() => onTabChange('contacts')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
          activeTab === 'contacts' ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Contacts</span>
      </button>

      <button
        onClick={() => onTabChange('activities')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
          activeTab === 'activities' ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <BookOpen className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Journal</span>
      </button>

      <button
        onClick={() => onTabChange('finances')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
          activeTab === 'finances' ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className="relative">
          <ReceiptEuro className="w-5 h-5 mb-0.5" />
          {badgeCounts?.pendingQuotes !== undefined && badgeCounts.pendingQuotes > 0 && (
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </div>
        <span className="text-[10px] tracking-tight">Finances</span>
      </button>

      <button
        onClick={onOpenDrawer}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
          isMenuTab ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className="relative">
          <Menu className="w-5 h-5 mb-0.5" />
          {((badgeCounts?.overdueTasks && badgeCounts.overdueTasks > 0) || (badgeCounts?.renewingContracts && badgeCounts.renewingContracts > 0)) && (
            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>
        <span className="text-[10px] tracking-tight">Menu</span>
      </button>
    </nav>
  );
};
