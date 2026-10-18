import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Plus,
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { api, formatEuro, formatDateFr } from '../services/api.ts';
import { Mission, Contact, MissionStatus } from '../types/crm.ts';

interface MissionsViewProps {
  onSelectContact: (id: number) => void;
  onOpenQuickLogForMission: (contactId: number, missionId: number) => void;
}

const MISSION_STATUSES: MissionStatus[] = [
  'à cadrer',
  'à chiffrer',
  'devis envoyé',
  'en attente',
  'planifiée',
  'en cours',
  'en pause',
  'livrée',
  'clôturée',
  'annulée'
];

export const MissionsView: React.FC<MissionsViewProps> = ({
  onSelectContact,
  onOpenQuickLogForMission
}) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('tous');

  // New Mission Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    contact_id: '',
    service_category: 'Création site web',
    is_recurring: 0,
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'en cours' as MissionStatus,
    estimated_amount: 2500,
    accepted_amount: 2500,
    time_budget_hours: 30,
    notes: ''
  });

  // Edit Mission Modal
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Mission Modal
  const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-app notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mss, cts] = await Promise.all([
        api.getMissions({ status: statusFilter }),
        api.getContacts()
      ]);
      setMissions(mss);
      setContacts(cts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.contact_id) {
      setNotification({
        type: 'error',
        message: 'Veuillez renseigner le titre et sélectionner un client.'
      });
      return;
    }
    try {
      await api.createMission({
        ...form,
        contact_id: Number(form.contact_id)
      });
      setIsModalOpen(false);
      setForm({
        title: '',
        contact_id: '',
        service_category: 'Création site web',
        is_recurring: 0,
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        status: 'en cours',
        estimated_amount: 2500,
        accepted_amount: 2500,
        time_budget_hours: 30,
        notes: ''
      });
      setNotification({
        type: 'success',
        message: 'Mission créée avec succès.'
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la création de la mission'
      });
    }
  };

  const handleOpenEdit = (m: Mission) => {
    setEditingMission(m);
    setEditForm({
      title: m.title,
      contact_id: m.contact_id,
      service_category: m.service_category,
      is_recurring: m.is_recurring,
      description: m.description || '',
      start_date: m.start_date || '',
      expected_delivery_date: m.expected_delivery_date || '',
      actual_close_date: m.actual_close_date || '',
      status: m.status,
      estimated_amount: m.estimated_amount || 0,
      accepted_amount: m.accepted_amount || 0,
      invoiced_amount: m.invoiced_amount || 0,
      collected_amount: m.collected_amount || 0,
      time_budget_hours: m.time_budget_hours || 0,
      notes: m.notes || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMission) return;
    setEditSubmitting(true);
    try {
      await api.updateMission(editingMission.id, {
        ...editForm,
        contact_id: Number(editForm.contact_id)
      });
      setEditingMission(null);
      setNotification({
        type: 'success',
        message: `Mission "${editForm.title}" modifiée avec succès.`
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la modification'
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!missionToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteMission(missionToDelete.id);
      setNotification({
        type: 'success',
        message: `Mission "${missionToDelete.title}" supprimée.`
      });
      setMissionToDelete(null);
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (missionId: number, newStatus: MissionStatus) => {
    try {
      await api.updateMission(missionId, { status: newStatus });
      setNotification({
        type: 'success',
        message: `Statut de la mission mis à jour vers "${newStatus}".`
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors du changement de statut'
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Missions & Projets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des prestations, modification, budgets temps, facturation et suppression
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle mission</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto">
        {['tous', 'en cours', 'devis envoyé', 'planifiée', 'livrée', 'clôturée'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              statusFilter === st
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Missions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : missions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">Aucune mission trouvée</h3>
          <p className="text-xs text-slate-500 mt-1">Créez votre première mission pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missions.map((m) => {
            const actualHours = (m.actual_minutes_spent || 0) / 60;
            const budgetHours = m.time_budget_hours || 0;
            const isOverBudget = budgetHours > 0 && actualHours > budgetHours;

            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {m.reference}
                        </span>
                        <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {m.service_category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {m.title}
                      </h3>
                      {m.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {m.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={() => onSelectContact(m.contact_id)}
                      className="font-medium hover:text-indigo-600 transition-colors"
                    >
                      {m.company_name || m.contact_name}
                    </button>
                  </div>

                  {/* Financial & Time Meta */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-500">Montant convenu :</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        {formatEuro(m.accepted_amount || m.estimated_amount || 0)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Facturé : {formatEuro(m.invoiced_amount || 0)}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500">Temps passé :</span>
                        <span className={isOverBudget ? 'text-red-600 font-bold' : 'text-slate-800 font-medium'}>
                          {Math.round(actualHours * 10) / 10}h / {budgetHours}h
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-indigo-600'}`}
                          style={{ width: `${Math.min(100, (actualHours / (budgetHours || 1)) * 100)}%` }}
                        />
                      </div>
                      {m.expected_delivery_date && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          Livraison : {formatDateFr(m.expected_delivery_date)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom action bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">Statut :</span>
                    <select
                      value={m.status}
                      onChange={(e) => handleStatusChange(m.id, e.target.value as MissionStatus)}
                      className="px-2 py-1 text-xs border border-slate-200 rounded font-medium bg-white text-slate-800"
                    >
                      {MISSION_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => onOpenQuickLogForMission(m.contact_id, m.id)}
                      className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors"
                      title="Consigner travail sur cette mission"
                    >
                      + Action
                    </button>

                    {/* Modifier */}
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors"
                      title="Modifier cette mission"
                    >
                      <Pencil className="w-3 h-3 text-slate-500" />
                      <span>Modifier</span>
                    </button>

                    {/* Supprimer */}
                    <button
                      onClick={() => setMissionToDelete(m)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded shadow-2xs transition-colors"
                      title="Supprimer cette mission"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                      <span>Supprimer</span>
                    </button>

                    <button
                      onClick={() => onSelectContact(m.contact_id)}
                      className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 rounded transition-colors"
                      title="Ouvrir la fiche client"
                    >
                      Client →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Mission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Créer une nouvelle mission</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client associé *</label>
                <select
                  required
                  value={form.contact_id}
                  onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">Sélectionner un contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom / Intitulé de la mission *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Refonte boutique e-commerce WooCommerce"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie de prestation</label>
                  <select
                    value={form.service_category}
                    onChange={(e) => setForm({ ...form, service_category: e.target.value })}
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
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as MissionStatus })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {MISSION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant estimé (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={form.estimated_amount}
                    onChange={(e) => setForm({ ...form, estimated_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant accepté (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={form.accepted_amount}
                    onChange={(e) => setForm({ ...form, accepted_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Budget temps (heures)</label>
                  <input
                    type="number"
                    step="1"
                    value={form.time_budget_hours}
                    onChange={(e) => setForm({ ...form, time_budget_hours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date livraison prévue</label>
                  <input
                    type="date"
                    value={form.expected_delivery_date}
                    onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Périmètre</label>
                <textarea
                  rows={2}
                  placeholder="Spécifications, livrables attendus..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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

      {/* Edit Mission Modal */}
      {editingMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Modifier la mission ({editingMission.reference})
                </h3>
              </div>
              <button onClick={() => setEditingMission(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client associé *</label>
                <select
                  required
                  value={editForm.contact_id}
                  onChange={(e) => setEditForm({ ...editForm, contact_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom / Intitulé de la mission *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie de prestation</label>
                  <select
                    value={editForm.service_category}
                    onChange={(e) => setEditForm({ ...editForm, service_category: e.target.value })}
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
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as MissionStatus })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {MISSION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant estimé (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={editForm.estimated_amount}
                    onChange={(e) => setEditForm({ ...editForm, estimated_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant accepté (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={editForm.accepted_amount}
                    onChange={(e) => setEditForm({ ...editForm, accepted_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant facturé (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={editForm.invoiced_amount}
                    onChange={(e) => setEditForm({ ...editForm, invoiced_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant encaissé (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={editForm.collected_amount}
                    onChange={(e) => setEditForm({ ...editForm, collected_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Budget temps (h)</label>
                  <input
                    type="number"
                    step="1"
                    value={editForm.time_budget_hours}
                    onChange={(e) => setEditForm({ ...editForm, time_budget_hours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date début</label>
                  <input
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Livraison prévue</label>
                  <input
                    type="date"
                    value={editForm.expected_delivery_date}
                    onChange={(e) => setEditForm({ ...editForm, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Périmètre</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes et observations</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMission(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  {editSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Mission Confirmation Modal */}
      {missionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Supprimer la mission
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {missionToDelete.reference} · {missionToDelete.title}
                </p>
              </div>
            </div>

            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer cette mission ? Les activités et tâches liées à cette mission seront dissociées mais non supprimées.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMissionToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-xs"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
