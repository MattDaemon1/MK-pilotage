import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  Plus,
  Clock,
  Calendar,
  Building2,
  TrendingUp,
  AlertTriangle,
  RotateCw
} from 'lucide-react';
import { api, formatEuro, formatDateFr } from '../services/api.ts';
import { Contract, Contact, ContractFrequency, ContractStatus } from '../types/crm.ts';

interface ContractsViewProps {
  onSelectContact: (id: number) => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({ onSelectContact }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalMrr, setTotalMrr] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    contact_id: '',
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    frequency: 'mensuelle' as ContractFrequency,
    amount_per_period: 250,
    next_renewal_date: '',
    notice_period_days: 30,
    included_hours_per_month: 2,
    status: 'actif' as ContractStatus,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, cts] = await Promise.all([
        api.getContracts(),
        api.getContacts()
      ]);
      setContracts(res.contracts);
      setTotalMrr(res.total_mrr);
      setContacts(cts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_id || !form.title) {
      alert('Veuillez sélectionner un contact et donner un titre.');
      return;
    }
    try {
      await api.createContract({
        ...form,
        contact_id: Number(form.contact_id),
        amount_per_period: Number(form.amount_per_period),
        notice_period_days: Number(form.notice_period_days),
        included_hours_per_month: Number(form.included_hours_per_month)
      });
      setIsModalOpen(false);
      setForm({
        contact_id: '',
        title: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        frequency: 'mensuelle',
        amount_per_period: 250,
        next_renewal_date: '',
        notice_period_days: 30,
        included_hours_per_month: 2,
        status: 'actif',
        notes: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id: number, newStatus: ContractStatus) => {
    try {
      await api.updateContract(id, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Identify renewals in next 30 days
  const today = new Date().toISOString().split('T')[0];
  const upcomingRenewals = contracts.filter((c) => {
    return c.status === 'actif' && c.next_renewal_date && c.next_renewal_date <= new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Contrats récurrents & MRR
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintenance, hébergement, infogérance et abonnements de services
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau contrat</span>
        </button>
      </div>

      {/* MRR Top Highlight Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-indigo-900 text-white rounded-xl shadow-xs border border-indigo-800">
          <div className="flex items-center justify-between text-indigo-200 text-xs mb-2">
            <span>Revenu Mensuel Récurrent (MRR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {formatEuro(totalMrr)} / mois
          </div>
          <p className="text-[11px] text-indigo-300 mt-1">
            Revenu prévisionnel lissé normalisé sur 12 mois
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>Contrats actifs</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {contracts.filter((c) => c.status === 'actif').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sur un total de {contracts.length} contrats enregistrés
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>Échéances sous 30 jours</span>
            <AlertTriangle className={`w-4 h-4 ${upcomingRenewals.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {upcomingRenewals.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            À renouveler ou à refacturer prochainement
          </p>
        </div>
      </div>

      {/* Contracts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
          <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Aucun contrat récurrent</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Ajoutez vos contrats de maintenance WordPress, d'hébergement ou de suivi régulier.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Créer un contrat
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {c.reference}
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">{c.title}</h2>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-600 capitalize">{c.frequency}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={() => onSelectContact(c.contact_id)}
                      className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline"
                    >
                      {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                    </button>
                    {c.included_hours_per_month > 0 && (
                      <span className="text-slate-400">· {c.included_hours_per_month}h de support/mois incluses</span>
                    )}
                  </div>

                  {c.description && (
                    <p className="text-xs text-slate-600 pt-1 max-w-2xl">{c.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 font-mono">
                    <span>Début : {formatDateFr(c.start_date)}</span>
                    {c.end_date && <span>Fin : {formatDateFr(c.end_date)}</span>}
                    {c.next_renewal_date && (
                      <span className="text-amber-700 font-semibold">
                        Renouvellement : {formatDateFr(c.next_renewal_date)}
                      </span>
                    )}
                    <span>Préavis : {c.notice_period_days} jours</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    {formatEuro(c.amount_per_period)}
                  </div>
                  <div className="text-xs font-mono text-indigo-700 font-semibold">
                    MRR : {formatEuro(c.normalized_mrr || 0)} / mois
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Statut :</span>
                  <select
                    value={c.status}
                    onChange={(e) => handleStatusChange(c.id, e.target.value as ContractStatus)}
                    className="px-2 py-1 text-xs border border-slate-200 rounded font-medium bg-white text-slate-800"
                  >
                    <option value="actif">Actif</option>
                    <option value="en attente">En attente signature</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="résilié">Résilié</option>
                    <option value="expiré">Expiré</option>
                  </select>
                </div>

                <button
                  onClick={() => onSelectContact(c.contact_id)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Ouvrir fiche client →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Contract Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Nouveau contrat récurrent</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client *</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Intitulé du contrat *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maintenance WordPress Sérénité & Sécurité"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fréquence de facturation</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value as ContractFrequency })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="mensuelle">Mensuelle</option>
                    <option value="trimestrielle">Trimestrielle</option>
                    <option value="semestrielle">Semestrielle</option>
                    <option value="annuelle">Annuelle</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant par période (€) *</label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={form.amount_per_period}
                    onChange={(e) => setForm({ ...form, amount_per_period: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date début *</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prochain renouvellement</label>
                  <input
                    type="date"
                    value={form.next_renewal_date}
                    onChange={(e) => setForm({ ...form, next_renewal_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Heures de support incluses / mois</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.included_hours_per_month}
                    onChange={(e) => setForm({ ...form, included_hours_per_month: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Préavis (jours)</label>
                  <input
                    type="number"
                    value={form.notice_period_days}
                    onChange={(e) => setForm({ ...form, notice_period_days: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Périmètre</label>
                <textarea
                  rows={2}
                  placeholder="Sauvegardes quotidiennes, mises à jour plugins, temps de réponse..."
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
                  Enregistrer le contrat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
