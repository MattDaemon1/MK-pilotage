import React, { useEffect, useState } from 'react';
import {
  Users,
  Briefcase,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileCheck2,
  ReceiptEuro,
  ArrowRight,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { api, formatEuro, formatDateFr, formatDuration } from '../services/api.ts';
import { DashboardData } from '../types/crm.ts';
import { ActiveTab } from '../components/Sidebar.tsx';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab, entityId?: number) => void;
  onOpenQuickLog: (contactId?: number, missionId?: number) => void;
  onSelectContact: (id: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickLog,
  onSelectContact
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-lg border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error || 'Erreur inconnue'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Pilotage de l'activité Matt Konnect
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vue synthétique temps réel · Base locale SQLite
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('contacts')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Nouveau contact
          </button>
          <button
            onClick={() => onNavigate('missions')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Nouvelle mission
          </button>
          <button
            onClick={() => onOpenQuickLog()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Consigner mon travail
          </button>
        </div>
      </div>

      {/* Clean Database Welcome Callout */}
      {data.active_clients === 0 && data.active_missions === 0 && (
        <div className="bg-gradient-to-r from-indigo-50/90 to-blue-50/90 border border-indigo-100 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              Base de données prête & épurée
            </h2>
            <p className="text-[11px] sm:text-xs text-indigo-800 leading-relaxed max-w-xl">
              Votre espace CRM est complètement vierge de données d'exemple. Créez votre premier contact ou consigner directement vos interventions et devis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('contacts')}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              + Ajouter un contact
            </button>
            <button
              onClick={() => onOpenQuickLog()}
              className="px-3 py-1.5 text-xs font-medium bg-white text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 cursor-pointer"
            >
              Consigner une action
            </button>
          </div>
        </div>
      )}

      {/* Row 1: Pipeline & Portfolio Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigate('contacts')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Clients actifs</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {data.active_clients}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            + {data.active_prospects} prospects en cours
          </div>
        </div>

        <div
          onClick={() => onNavigate('missions')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Missions en cours</span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {data.active_missions}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Prestations actives ou planifiées
          </div>
        </div>

        <div
          onClick={() => onNavigate('contracts')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Revenu récurrent (MRR)</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatEuro(data.mrr)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Normalisé mensuel · Maintenance & Infogérance
          </div>
        </div>

        <div
          onClick={() => onNavigate('tasks')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tâches en retard</span>
            <AlertTriangle className={`w-4 h-4 ${data.overdue_tasks > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {data.overdue_tasks}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.today_tasks} à faire aujourd'hui
          </div>
        </div>
      </div>

      {/* Row 2: Financial Integrity Section (Distinguishing Signed, Invoiced, Collected, Remaining) */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xs border border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              <ReceiptEuro className="w-4 h-4 text-emerald-400" />
              Pilotage financier réel
            </h2>
            <p className="text-xs text-slate-400">
              Distinction stricte entre devis signés, factures émises et encaissements réels
            </p>
          </div>
          <button
            onClick={() => onNavigate('finances')}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Voir factures</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 text-center sm:text-left">
          <div>
            <div className="text-xs text-slate-400 mb-1">CA Signé (Devis acceptés)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-indigo-300">
              {formatEuro(data.signed_revenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{data.pending_quotes} devis en attente</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">CA Facturé (Émis TTC)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white">
              {formatEuro(data.invoiced_revenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Total factures enregistrées</div>
          </div>

          <div>
            <div className="text-xs text-emerald-300 mb-1">Encaissé sur compte</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-400">
              {formatEuro(data.collected_revenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Règlements reçus</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Reste à encaisser</div>
            <div className="text-lg font-bold font-mono tabular-nums text-amber-300">
              {formatEuro(data.remaining_revenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Facturé moins encaissé</div>
          </div>

          <div>
            <div className="text-xs text-red-300 mb-1">Retards de paiement</div>
            <div className="text-lg font-bold font-mono tabular-nums text-red-400">
              {formatEuro(data.overdue_amount)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Échéance dépassée</div>
          </div>
        </div>
      </div>

      {/* Row 3: Actionable Queues (Relances & Échéances + Renouvellements contrats) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Relances prioritaires */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Prochaines relances & actions
            </h3>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Gérer
            </button>
          </div>

          {data.follow_ups_needed.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Aucune relance en attente dans les 7 jours.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.follow_ups_needed.map((f) => (
                <div
                  key={f.id}
                  onClick={() => onSelectContact(f.id)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {f.company_name ? `${f.company_name} · ${f.contact_name}` : f.contact_name}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {f.next_action || 'Point de suivi prévu'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono tabular-nums text-indigo-600 font-medium">
                      {formatDateFr(f.follow_up_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Renouvellements contrats récurrents */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
              Renouvellements de contrats ({data.renewing_contracts_count})
            </h3>
            <button
              onClick={() => onNavigate('contracts')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Voir contrats
            </button>
          </div>

          {data.renewing_contracts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Aucun renouvellement contractuel dans les 30 jours.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.renewing_contracts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate('contracts')}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {c.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {c.company_name || c.contact_name} · {formatEuro(c.amount_per_period)} / {c.frequency}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono tabular-nums text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded">
                      Échéance: {formatDateFr(c.next_renewal_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Temps passé & Activités Récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temps passé (30 derniers jours) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Temps passé par catégorie (30 derniers jours)
            </h3>
            <button
              onClick={() => onNavigate('activities')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Journal complet
            </button>
          </div>

          {data.time_spent_by_category.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Aucune activité enregistrée ce mois-ci.</p>
          ) : (
            <div className="space-y-3">
              {data.time_spent_by_category.map((item) => {
                const totalMinutes = data.time_spent_by_category.reduce((a, b) => a + b.total_minutes, 0) || 1;
                const pct = Math.round((item.total_minutes / totalMinutes) * 100);
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{item.category}</span>
                      <span className="font-mono tabular-nums text-slate-600 font-medium">
                        {formatDuration(item.total_minutes)} <span className="text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dernières entrées du journal de travail */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Dernières actions consignées
            </h3>
            <button
              onClick={() => onOpenQuickLog()}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + Ajouter
            </button>
          </div>

          {data.recent_activities.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Aucune activité récente.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_activities.map((a) => (
                <div
                  key={a.id}
                  onClick={() => onNavigate('activities')}
                  className="py-2.5 flex items-start justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {a.title}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{a.category}</span>
                      <span>·</span>
                      <span>{a.company_name || a.contact_name || 'Interne'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-mono tabular-nums text-slate-700 font-medium">
                      {formatDuration(a.duration_minutes)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDateFr(a.activity_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
