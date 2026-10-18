import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  Plus,
  Clock,
  Calendar,
  Building2,
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Pencil,
  Trash2,
  CheckCircle
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

  // New Contract Modal
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

  // Edit Contract Modal
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Contract Modal
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
      setNotification({
        type: 'error',
        message: 'Veuillez sélectionner un contact et renseigner un intitulé.'
      });
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
      setNotification({
        type: 'success',
        message: 'Contrat récurrent créé avec succès.'
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la création du contrat'
      });
    }
  };

  const handleOpenEdit = (c: Contract) => {
    setEditingContract(c);
    setEditForm({
      contact_id: c.contact_id,
      title: c.title,
      description: c.description || '',
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      frequency: c.frequency,
      amount_per_period: c.amount_per_period,
      next_renewal_date: c.next_renewal_date || '',
      notice_period_days: c.notice_period_days || 30,
      included_hours_per_month: c.included_hours_per_month || 0,
      status: c.status,
      notes: c.notes || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    setEditSubmitting(true);
    try {
      await api.updateContract(editingContract.id, {
        ...editForm,
        contact_id: Number(editForm.contact_id),
        amount_per_period: Number(editForm.amount_per_period),
        notice_period_days: Number(editForm.notice_period_days),
        included_hours_per_month: Number(editForm.included_hours_per_month)
      });
      setEditingContract(null);
      setNotification({
        type: 'success',
        message: `Contrat "${editForm.title}" mis à jour avec succès.`
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
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteContract(contractToDelete.id);
      setNotification({
        type: 'success',
        message: `Contrat "${contractToDelete.title}" supprimé avec succès.`
      });
      setContractToDelete(null);
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

  const handleStatusChange = async (id: number, newStatus: ContractStatus) => {
    try {
      await api.updateContract(id, { status: newStatus });
      setNotification({
        type: 'success',
        message: `Statut du contrat mis à jour vers "${newStatus}".`
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la mise à jour'
      });
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
            Maintenance, hébergement, infogérance, modification des abonnements et résiliation
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

      {/* MRR Top Highlight Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-indigo-900 text-white rounded-xl shadow-xs border border-indigo-800">
          <div className="flex items-center justify-between text-indigo-200 text-xs mb-2">
            <span>Revenu Mensuel Récurrent (MRR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono tracking-tight tabular-nums">
            {formatEuro(totalMrr)}
          </div>
          <div className="text-indigo-300 text-[11px] mt-2">
            Calculé sur la base de {contracts.filter((c) => c.status === 'actif').length} contrat(s) actif(s)
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-slate-500 text-xs font-medium mb-1">
            Revenu Annuel Récurrent (ARR estimé)
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {formatEuro(totalMrr * 12)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Projection sur 12 mois hors résiliation</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-xs font-medium">Reconductions sous 30 jours</span>
            <RotateCw className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
            {upcomingRenewals.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {upcomingRenewals.length > 0 ? 'Pensez à éditer ou relancer les factures' : 'Aucune échéance critique'}
          </p>
        </div>
      </div>

      {/* Contracts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">Aucun contrat récurrent enregistré</h3>
          <p className="text-xs text-slate-500 mt-1">
            Les contrats récurrents permettent d'anticiper votre trésorerie et calculer automatiquement votre MRR.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                      {c.reference}
                    </span>
                    <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded capitalize">
                      {c.frequency}
                    </span>
                    {c.included_hours_per_month && c.included_hours_per_month > 0 ? (
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {c.included_hours_per_month}h incluses / mois
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {c.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={() => onSelectContact(c.contact_id)}
                      className="font-medium hover:text-indigo-600 transition-colors"
                    >
                      {c.company_name || c.contact_name}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span>Début : {formatDateFr(c.start_date)}</span>
                    {c.next_renewal_date && (
                      <span className="text-indigo-600 font-medium">
                        Prochaine reconduction : {formatDateFr(c.next_renewal_date)}
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

              <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
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

                <div className="flex items-center gap-1.5">
                  {/* Modifier */}
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors"
                    title="Modifier ce contrat"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Modifier</span>
                  </button>

                  {/* Supprimer */}
                  <button
                    onClick={() => setContractToDelete(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded shadow-2xs transition-colors"
                    title="Supprimer ce contrat"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Supprimer</span>
                  </button>

                  <button
                    onClick={() => onSelectContact(c.contact_id)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 ml-2"
                  >
                    Fiche client →
                  </button>
                </div>
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
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white capitalize"
                  >
                    <option value="mensuelle">Mensuelle</option>
                    <option value="trimestrielle">Trimestrielle</option>
                    <option value="semestrielle">Semestrielle</option>
                    <option value="annuelle">Annuelle</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant par période (€ HT) *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Date d'effet (Début)</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prochaine reconduction</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Préavis de résiliation (jours)</label>
                  <input
                    type="number"
                    value={form.notice_period_days}
                    onChange={(e) => setForm({ ...form, notice_period_days: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Heures support incluses / mois</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.included_hours_per_month}
                    onChange={(e) => setForm({ ...form, included_hours_per_month: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Services inclus</label>
                <textarea
                  rows={2}
                  placeholder="Sauvegardes journalières, monitoring 24/7, mises à jour..."
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
                  Créer le contrat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Modifier le contrat ({editingContract.reference})
                </h3>
              </div>
              <button onClick={() => setEditingContract(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client *</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Intitulé du contrat *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Fréquence de facturation</label>
                  <select
                    value={editForm.frequency}
                    onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value as ContractFrequency })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white capitalize"
                  >
                    <option value="mensuelle">Mensuelle</option>
                    <option value="trimestrielle">Trimestrielle</option>
                    <option value="semestrielle">Semestrielle</option>
                    <option value="annuelle">Annuelle</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant par période (€ HT) *</label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={editForm.amount_per_period}
                    onChange={(e) => setEditForm({ ...editForm, amount_per_period: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ContractStatus })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="actif">Actif</option>
                    <option value="en attente">En attente signature</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="résilié">Résilié</option>
                    <option value="expiré">Expiré</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Préavis (jours)</label>
                  <input
                    type="number"
                    value={editForm.notice_period_days}
                    onChange={(e) => setEditForm({ ...editForm, notice_period_days: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'effet (Début)</label>
                  <input
                    type="date"
                    required
                    value={editForm.start_date}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prochaine reconduction</label>
                  <input
                    type="date"
                    value={editForm.next_renewal_date}
                    onChange={(e) => setEditForm({ ...editForm, next_renewal_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Services inclus</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes et conditions particulières</label>
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
                  onClick={() => setEditingContract(null)}
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

      {/* Delete Contract Confirmation Modal */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Supprimer le contrat récurrent
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {contractToDelete.reference} · {contractToDelete.title}
                </p>
              </div>
            </div>

            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer définitivement ce contrat ? Les factures déjà émises pour ce contrat seront conservées.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setContractToDelete(null)}
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
