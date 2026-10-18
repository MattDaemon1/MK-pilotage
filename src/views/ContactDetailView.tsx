import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  Briefcase,
  FileCheck2,
  ReceiptEuro,
  CheckSquare,
  Edit,
  UserCheck,
  Plus,
  Calendar,
  AlertCircle,
  FileText,
  Trash2,
  Archive
} from 'lucide-react';
import { api, formatEuro, formatDateFr, formatDuration } from '../services/api.ts';
import { ContactDetailResponse, ContactStatus } from '../types/crm.ts';

interface ContactDetailViewProps {
  contactId: number;
  onBack: () => void;
  onOpenQuickLog: (contactId: number, missionId?: number) => void;
  onNavigateToMissions: () => void;
}

type TabKey =
  | 'overview'
  | 'activities'
  | 'missions'
  | 'contracts'
  | 'finances'
  | 'time'
  | 'tasks'
  | 'notes';

export const ContactDetailView: React.FC<ContactDetailViewProps> = ({
  contactId,
  onBack,
  onOpenQuickLog,
  onNavigateToMissions
}) => {
  const [data, setData] = useState<ContactDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Activity filter state within client hub
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('toutes');
  const [activityMissionFilter, setActivityMissionFilter] = useState<number | 'toutes'>('toutes');

  // Edit contact info modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // New Mission for this client modal
  const [isNewMissionOpen, setIsNewMissionOpen] = useState(false);
  const [missionForm, setMissionForm] = useState({
    title: '',
    service_category: 'Refonte site web',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    estimated_amount: 1500,
    accepted_amount: 1500,
    time_budget_hours: 20
  });

  // New Task for this client modal
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'normale' as any,
    task_type: 'technique',
    estimated_duration_minutes: 30
  });

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    setLoading(true);
    try {
      const res = await api.getContact(contactId);
      setData(res);
      setEditForm(res.contact);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du contact');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!data) return;
    if (!window.confirm(`Confirmez-vous la conversion officielle de "${data.contact.contact_name}" en Client ? Tout l'historique et les devis seront conservés.`)) {
      return;
    }
    try {
      await api.convertProspectToClient(contactId);
      loadContact();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveContactEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      await api.updateContact(contactId, editForm);
      setIsEditing(false);
      loadContact();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMission({
        ...missionForm,
        contact_id: contactId
      });
      setIsNewMissionOpen(false);
      setMissionForm({
        title: '',
        service_category: 'Refonte site web',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        estimated_amount: 1500,
        accepted_amount: 1500,
        time_budget_hours: 20
      });
      loadContact();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTask({
        ...taskForm,
        contact_id: contactId
      });
      setIsNewTaskOpen(false);
      setTaskForm({
        title: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'normale',
        task_type: 'technique',
        estimated_duration_minutes: 30
      });
      loadContact();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'terminée' ? 'à faire' : 'terminée';
    try {
      await api.updateTask(taskId, { status: newStatus });
      loadContact();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
        <div className="h-28 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux contacts
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error || 'Contact non trouvé'}
        </div>
      </div>
    );
  }

  const { contact, metrics, activities, missions, contracts, quotes, invoices, payments, tasks } = data;

  // Filter activities for this contact
  const filteredActivities = activities.filter((a) => {
    if (activityCategoryFilter !== 'toutes' && a.category !== activityCategoryFilter) return false;
    if (activityMissionFilter !== 'toutes' && a.mission_id !== Number(activityMissionFilter)) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top back & actions bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste des contacts</span>
        </button>

        <div className="flex items-center gap-2">
          {contact.status === 'prospect' && (
            <button
              onClick={handleConvert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Convertir en Client</span>
            </button>
          )}

          <button
            onClick={() => onOpenQuickLog(contact.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Consigner une action</span>
          </button>

          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Modifier les coordonnées"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contact Profile Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {contact.contact_name}
              </h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                contact.status === 'client'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : contact.status === 'prospect'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {contact.status === 'prospect' ? 'Prospect' : contact.status === 'client' ? 'Client' : contact.status}
              </span>
            </div>

            {contact.company_name && (
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{contact.company_name}</span>
                {contact.role_title && <span className="text-slate-400">· {contact.role_title}</span>}
                {contact.industry && <span className="text-slate-400">· {contact.industry}</span>}
              </div>
            )}

            {/* Quick Contact info */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-slate-900">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-slate-900">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {contact.website && (
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.website.replace('https://', '').replace('http://', '')}</span>
                </a>
              )}
              {contact.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.city} {contact.postal_code ? `(${contact.postal_code})` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next action spotlight box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg min-w-[240px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Prochaine action prévue
            </div>
            <div className="text-xs font-semibold text-slate-900">
              {contact.next_action || 'Aucune action planifiée'}
            </div>
            {contact.follow_up_date && (
              <div className="text-[11px] font-mono tabular-nums text-indigo-600 font-medium mt-1">
                Date de relance : {formatDateFr(contact.follow_up_date)}
              </div>
            )}
          </div>
        </div>

        {/* Top 6 Indicators Bar as mandated by user prompt */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6 pt-4 border-t border-slate-100 text-center sm:text-left">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">CA Facturé</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {formatEuro(metrics.total_invoiced)}
            </div>
            <div className="text-[10px] text-emerald-600 font-mono">
              Encaissé : {formatEuro(metrics.total_collected)}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Missions en cours</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {formatEuro(metrics.running_missions_amount)}
            </div>
            <div className="text-[10px] text-slate-500">
              {metrics.active_missions_count} mission(s)
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Contrats actifs</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {metrics.active_contracts_count}
            </div>
            <div className="text-[10px] text-slate-500">
              Maintenance / Récurrent
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Temps passé total</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {metrics.total_hours_spent} h
            </div>
            <div className="text-[10px] text-slate-500">
              {activities.length} action(s)
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Dernière interaction</div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
              {metrics.last_interaction ? formatDateFr(metrics.last_interaction.activity_date) : 'Aucune'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {metrics.last_interaction?.title || '—'}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Solde dû</div>
            <div className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${metrics.balance_due > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {formatEuro(metrics.balance_due)}
            </div>
            <div className="text-[10px] text-slate-500">
              {metrics.balance_due > 0 ? 'En attente' : 'À jour'}
            </div>
          </div>
        </div>
      </div>

      {/* 8 Central Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex items-center gap-1 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Vue d’ensemble' },
            { id: 'activities', label: `Journal d'activités (${activities.length})` },
            { id: 'missions', label: `Missions & projets (${missions.length})` },
            { id: 'contracts', label: `Contrats (${contracts.length})` },
            { id: 'finances', label: `Devis & factures (${quotes.length + invoices.length})` },
            { id: 'time', label: `Temps passé (${metrics.total_hours_spent}h)` },
            { id: 'tasks', label: `Tâches & échéances (${tasks.length})` },
            { id: 'notes', label: 'Notes & coordonnées' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Vue d'ensemble */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Missions in progress */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  Missions récentes
                </h3>
                <button
                  onClick={() => setIsNewMissionOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Nouvelle mission
                </button>
              </div>

              {missions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Aucune mission créée pour ce contact.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {missions.map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {m.reference} · {m.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {m.service_category} · Statut : <span className="font-medium text-slate-700">{m.status}</span>
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-xs font-semibold text-slate-900">
                          {formatEuro(m.accepted_amount || m.estimated_amount)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {m.actual_hours_spent || 0}h passées
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Tasks */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  Tâches à faire
                </h3>
                <button
                  onClick={() => setIsNewTaskOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Tâche
                </button>
              </div>

              {tasks.filter((t) => t.status !== 'terminée').length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Aucune tâche en attente.
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.filter((t) => t.status !== 'terminée').map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTask(t.id, t.status)}
                      className="p-2 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer flex items-start gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-indigo-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">{t.title}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Échéance : {formatDateFr(t.due_date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activities preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Dernières interventions consignées
              </h3>
              <button
                onClick={() => onOpenQuickLog(contactId)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Consigner action
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Aucune activité consignée pour ce contact.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activities.slice(0, 5).map((a) => (
                  <div key={a.id} className="py-2.5 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-900">{a.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {a.category} {a.mission_title ? `· Mission : ${a.mission_title}` : ''}
                      </div>
                      {a.description && (
                        <p className="text-xs text-slate-600 mt-1 max-w-2xl">{a.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-medium text-slate-700">
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
      )}

      {/* Tab 2: Historique des activités (Full filterable journal) */}
      {activeTab === 'activities' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Historique chronologique des activités
              </h3>
              <p className="text-[11px] text-slate-500">
                Toutes les interventions, appels, réunions et temps passés
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={activityCategoryFilter}
                onChange={(e) => setActivityCategoryFilter(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
              >
                <option value="toutes">Toutes les catégories</option>
                <option value="Développement">Développement</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Appel">Appel</option>
                <option value="Email">Email</option>
                <option value="Rendez-vous">Rendez-vous</option>
                <option value="Audit de site">Audit de site</option>
                <option value="Mise à jour WordPress">Mise à jour WordPress</option>
                <option value="Administration">Administration</option>
              </select>

              <button
                onClick={() => onOpenQuickLog(contactId)}
                className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
              >
                + Consigner
              </button>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Aucune activité correspondant aux filtres.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredActivities.map((a) => (
                <div key={a.id} className="py-3 flex items-start justify-between">
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">{a.title}</span>
                      <span className="text-[11px] text-slate-500">· {a.category}</span>
                      {a.mission_title && (
                        <span className="text-[11px] text-indigo-600 font-medium">· {a.mission_title}</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {a.description}
                      </p>
                    )}
                    {a.result && (
                      <div className="text-[11px] text-emerald-700 font-medium">
                        Résultat : {a.result}
                      </div>
                    )}
                    {a.next_action && (
                      <div className="text-[11px] text-indigo-700 font-medium">
                        Prochaine action : {a.next_action}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-slate-800">
                      {formatDuration(a.duration_minutes)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {formatDateFr(a.activity_date)} {a.activity_time || ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Missions et projets */}
      {activeTab === 'missions' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Missions & Projets ({missions.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Prestations ponctuelles ou projets de développement
              </p>
            </div>
            <button
              onClick={() => setIsNewMissionOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              + Nouvelle mission
            </button>
          </div>

          {missions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune mission rattachée à ce contact.
            </div>
          ) : (
            <div className="space-y-3">
              {missions.map((m) => (
                <div key={m.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {m.reference} · {m.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {m.service_category} · Statut : <span className="font-semibold text-slate-800">{m.status}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-xs font-bold text-slate-900">
                        {formatEuro(m.accepted_amount || m.estimated_amount)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Facturé : {formatEuro(m.billed_amount || 0)} · Encaissé : {formatEuro(m.paid_amount || 0)}
                      </div>
                    </div>
                  </div>
                  {m.description && (
                    <p className="text-xs text-slate-600 mt-2">{m.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                    <span className="font-mono">
                      Temps : {m.actual_hours_spent || 0}h passées / Budget : {m.time_budget_hours || 0}h
                    </span>
                    <button
                      onClick={() => onOpenQuickLog(contactId, m.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + Consigner du travail sur cette mission
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Contrats récurrents */}
      {activeTab === 'contracts' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Contrats récurrents ({contracts.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Abonnements de maintenance, hébergement et infogérance
              </p>
            </div>
          </div>

          {contracts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucun contrat récurrent actif pour ce contact.
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => (
                <div key={c.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {c.reference} · {c.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Fréquence : {c.frequency} · Statut : <span className="font-semibold text-emerald-700">{c.status}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-bold text-slate-900">
                        {formatEuro(c.amount_per_period)} / {c.frequency}
                      </div>
                      {c.next_renewal_date && (
                        <div className="text-[10px] text-amber-700">
                          Renouvellement : {formatDateFr(c.next_renewal_date)}
                        </div>
                      )}
                    </div>
                  </div>
                  {c.description && (
                    <p className="text-xs text-slate-600 mt-2">{c.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Devis et factures */}
      {activeTab === 'finances' && (
        <div className="space-y-6">
          {/* Quotes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
              Devis émis ({quotes.length})
            </h3>
            {quotes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Aucun devis enregistré.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100">
                    <th className="py-2">Réf. Devis</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Mission</th>
                    <th className="py-2">Montant TTC</th>
                    <th className="py-2">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotes.map((q) => (
                    <tr key={q.id}>
                      <td className="py-2 font-mono font-medium text-slate-900">{q.quote_number}</td>
                      <td className="py-2 font-mono text-slate-600">{formatDateFr(q.issue_date)}</td>
                      <td className="py-2 text-slate-700">{q.mission_title || '—'}</td>
                      <td className="py-2 font-mono font-semibold text-slate-900">{formatEuro(q.amount_ttc)}</td>
                      <td className="py-2 font-medium">
                        <span className={q.status === 'accepté' ? 'text-emerald-700' : 'text-slate-600'}>
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
              Factures & Règlements ({invoices.length})
            </h3>
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Aucune facture émise.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100">
                    <th className="py-2">Réf. Facture</th>
                    <th className="py-2">Date émission</th>
                    <th className="py-2">Échéance</th>
                    <th className="py-2">Montant TTC</th>
                    <th className="py-2">Encaissé</th>
                    <th className="py-2">Statut paiement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                      <td className="py-2 font-mono text-slate-600">{formatDateFr(inv.issue_date)}</td>
                      <td className="py-2 font-mono text-slate-600">{formatDateFr(inv.due_date)}</td>
                      <td className="py-2 font-mono font-semibold text-slate-900">{formatEuro(inv.amount_ttc)}</td>
                      <td className="py-2 font-mono text-emerald-700 font-semibold">{formatEuro(inv.paid_amount || 0)}</td>
                      <td className="py-2 font-medium">
                        <span className={inv.payment_status === 'payé' ? 'text-emerald-700' : 'text-amber-700'}>
                          {inv.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Temps passé */}
      {activeTab === 'time' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Synthèse du temps passé sur ce client
              </h3>
              <p className="text-[11px] text-slate-500">
                Total : {metrics.total_hours_spent} heures réparties sur {activities.length} actions
              </p>
            </div>
            <button
              onClick={() => onOpenQuickLog(contactId)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              + Consigner du temps
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {activities.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{a.title}</div>
                  <div className="text-[11px] text-slate-500">{a.category} {a.mission_title ? `· ${a.mission_title}` : ''}</div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="font-bold text-slate-900">{formatDuration(a.duration_minutes)}</div>
                  <div className="text-[10px] text-slate-400">{formatDateFr(a.activity_date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Tâches et échéances */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Tâches & Relances associées
              </h3>
              <p className="text-[11px] text-slate-500">
                Suivi des livrables et des échéances
              </p>
            </div>
            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              + Nouvelle tâche
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune tâche associée à ce contact.
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 border rounded-lg flex items-center justify-between ${
                    t.status === 'terminée' ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={t.status === 'terminée'}
                      onChange={() => handleToggleTask(t.id, t.status)}
                      className="mt-0.5 rounded text-indigo-600 cursor-pointer"
                    />
                    <div>
                      <div className={`text-xs font-semibold ${t.status === 'terminée' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Priorité : {t.priority} {t.mission_title ? `· Mission : ${t.mission_title}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums text-xs">
                    <div className={t.status === 'terminée' ? 'text-slate-400' : 'text-indigo-600 font-semibold'}>
                      {formatDateFr(t.due_date)}
                    </div>
                    <div className="text-[10px] text-slate-400">{t.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 8: Notes et documents */}
      {activeTab === 'notes' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Notes générales & Informations détaillées
            </h3>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Modifier
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
            {contact.notes || 'Aucune note particulière enregistrée pour ce contact.'}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100 text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">Origine du lead :</span> {contact.lead_source}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Date de création :</span> {formatDateFr(contact.created_at)}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Adresse complète :</span> {contact.address || '—'}, {contact.postal_code || ''} {contact.city || ''}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Dernière mise à jour :</span> {formatDateFr(contact.updated_at)}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Contact */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Modifier la fiche contact</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveContactEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom du contact</label>
                  <input
                    type="text"
                    required
                    value={editForm.contact_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Entreprise</label>
                  <input
                    type="text"
                    value={editForm.company_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editForm.status || 'prospect'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="client">Client</option>
                    <option value="partenaire">Partenaire</option>
                    <option value="client_inactif">Client inactif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fonction</label>
                  <input
                    type="text"
                    value={editForm.role_title || ''}
                    onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prochaine action</label>
                  <input
                    type="text"
                    value={editForm.next_action || ''}
                    onChange={(e) => setEditForm({ ...editForm, next_action: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date relance</label>
                  <input
                    type="date"
                    value={editForm.follow_up_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, follow_up_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Mission */}
      {isNewMissionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Nouvelle mission pour {contact.contact_name}</h3>
              <button onClick={() => setIsNewMissionOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de la mission *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Refonte site vitrine WordPress & SEO"
                  value={missionForm.title}
                  onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catégorie de prestation</label>
                <select
                  value={missionForm.service_category}
                  onChange={(e) => setMissionForm({ ...missionForm, service_category: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="Création site web">Création site web</option>
                  <option value="Refonte site web">Refonte site web</option>
                  <option value="Maintenance WordPress">Maintenance WordPress</option>
                  <option value="Développement spécifique">Développement spécifique</option>
                  <option value="Audit de site">Audit de site</option>
                  <option value="Configuration GA4 et Google Tag Manager">Configuration GA4 et Google Tag Manager</option>
                  <option value="SEO">SEO</option>
                  <option value="Formation">Formation</option>
                  <option value="Conseil en intelligence artificielle">Conseil en intelligence artificielle</option>
                  <option value="Autre prestation">Autre prestation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant accepté (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={missionForm.accepted_amount}
                    onChange={(e) => setMissionForm({ ...missionForm, accepted_amount: Number(e.target.value), estimated_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Budget temps (heures)</label>
                  <input
                    type="number"
                    step="1"
                    value={missionForm.time_budget_hours}
                    onChange={(e) => setMissionForm({ ...missionForm, time_budget_hours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date début</label>
                  <input
                    type="date"
                    value={missionForm.start_date}
                    onChange={(e) => setMissionForm({ ...missionForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date livraison prévue</label>
                  <input
                    type="date"
                    value={missionForm.expected_delivery_date}
                    onChange={(e) => setMissionForm({ ...missionForm, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewMissionOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  Créer la mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Task */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Nouvelle tâche pour ce client</h3>
              <button onClick={() => setIsNewTaskOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de la tâche *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Livrer maquette, relancer devis..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priorité</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  Créer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
