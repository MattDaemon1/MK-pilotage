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
  FileText
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

  // Modal
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

  useEffect(() => {
    loadData();
  }, [statusFilter]);

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
      alert('Veuillez renseigner le titre et sélectionner un client.');
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
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (missionId: number, newStatus: MissionStatus) => {
    try {
      await api.updateMission(missionId, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.message);
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
            Suivi des prestations, livrables, budgets temps et montants engagés
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

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        {['tous', 'en cours', 'devis envoyé', 'planifiée', 'livrée', 'clôturée'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap capitalize transition-colors ${
              statusFilter === s ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Missions Grid / List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : missions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Aucune mission trouvée</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Créez une première mission rattachée à un client.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Créer une mission
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => {
            const actualHours = m.actual_hours_spent || 0;
            const budgetHours = m.time_budget_hours || 0;
            const timePct = budgetHours > 0 ? Math.min(100, Math.round((actualHours / budgetHours) * 100)) : 0;
            const isOverBudget = budgetHours > 0 && actualHours > budgetHours;

            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {m.reference}
                      </span>
                      <h2 className="text-sm font-bold text-slate-900">{m.title}</h2>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-medium text-slate-600">{m.service_category}</span>
                    </div>

                    {/* Client Link */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <button
                        onClick={() => onSelectContact(m.contact_id)}
                        className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline"
                      >
                        {m.company_name ? `${m.company_name} (${m.contact_name})` : m.contact_name}
                      </button>
                      {m.is_recurring === 1 && (
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                          Prestation récurrente
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {m.description && (
                      <p className="text-xs text-slate-600 pt-1 max-w-2xl">{m.description}</p>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                      {m.start_date && <span>Début : {formatDateFr(m.start_date)}</span>}
                      {m.expected_delivery_date && (
                        <span className="text-slate-600 font-medium">
                          Livraison prévue : {formatDateFr(m.expected_delivery_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial & Time gauges */}
                  <div className="flex flex-row md:flex-col items-end justify-between gap-3 text-right shrink-0">
                    <div>
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {formatEuro(m.accepted_amount || m.estimated_amount)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Facturé : {formatEuro(m.billed_amount || 0)} · Encaissé : {formatEuro(m.paid_amount || 0)}
                      </div>
                    </div>

                    {/* Time budget */}
                    <div className="min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                        <span className="text-slate-500">Temps :</span>
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenQuickLogForMission(m.contact_id, m.id)}
                      className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                    >
                      + Consigner travail sur cette mission
                    </button>
                    <button
                      onClick={() => onSelectContact(m.contact_id)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded transition-colors"
                    >
                      Voir client
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
    </div>
  );
};
