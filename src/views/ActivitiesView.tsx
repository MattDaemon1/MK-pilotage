import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Clock,
  Trash2,
  Edit,
  Filter,
  Building2,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Pencil
} from 'lucide-react';
import { api, formatDateFr, formatDuration } from '../services/api.ts';
import { Activity, Contact, Mission, ActivityCategory } from '../types/crm.ts';

interface ActivitiesViewProps {
  onSelectContact: (id: number) => void;
  onOpenQuickLog: () => void;
}

const CATEGORIES: ActivityCategory[] = [
  'Appel téléphonique',
  'E-mail',
  'Rendez-vous',
  'Prospection',
  'Audit de site',
  'Analyse technique',
  'Développement',
  'Maintenance',
  'Correction de bug',
  'Mise à jour WordPress',
  'Formation',
  'Conseil',
  'Réunion de cadrage',
  'Livraison',
  'Compte rendu',
  'Relance',
  'Administration',
  'Autre action'
];

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  onSelectContact,
  onOpenQuickLog
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit modal
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete modal
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedContact, selectedCategory, searchQuery, startDate, endDate]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [acts, cts, mss] = await Promise.all([
        api.getActivities({
          contact_id: selectedContact ? Number(selectedContact) : undefined,
          category: selectedCategory,
          search: searchQuery,
          from: startDate || undefined,
          to: endDate || undefined
        }),
        api.getContacts(),
        api.getMissions()
      ]);
      setActivities(acts);
      setContacts(cts);
      setMissions(mss);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activityToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteActivity(activityToDelete.id);
      setNotification({ type: 'success', message: 'Entrée supprimée du journal de travail.' });
      setActivityToDelete(null);
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la suppression' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    setEditSubmitting(true);
    try {
      await api.updateActivity(editingActivity.id, {
        ...editingActivity,
        contact_id: editingActivity.contact_id ? Number(editingActivity.contact_id) : undefined,
        mission_id: editingActivity.mission_id ? Number(editingActivity.mission_id) : undefined
      });
      setEditingActivity(null);
      setNotification({ type: 'success', message: 'Activité mise à jour avec succès.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la modification' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const totalMinutes = activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Journal de travail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Historique complet de toutes les actions, interventions techniques, modification et suppression
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono tabular-nums text-slate-700">
            Total affiché : <strong className="text-indigo-700">{formatDuration(totalMinutes)}</strong> ({activities.length} entrées)
          </div>
          <button
            onClick={onOpenQuickLog}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Consigner une action</span>
          </button>
        </div>
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

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Recherche mot-clé</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Titre, compte rendu, résultat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Client filter */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Filtrer par contact</label>
            <select
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Tous les contacts</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Catégorie d'activité</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Période (Début / Fin)</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-[11px]"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {(selectedContact || selectedCategory || searchQuery || startDate || endDate) && (
          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setSelectedContact('');
                setSelectedCategory('');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Réinitialiser tous les filtres
            </button>
          </div>
        )}
      </div>

      {/* Activity Timeline Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">Aucune activité trouvée</h3>
          <p className="text-xs text-slate-500 mt-1">
            Modifiez vos filtres ou enregistrez une nouvelle activité.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider block">
                      {formatDateFr(a.activity_date)} {a.activity_time ? `à ${a.activity_time.slice(0, 5)}` : ''}
                    </span>
                    <h4 className="font-semibold text-slate-900 text-sm mt-0.5">{a.title}</h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold font-mono text-xs border border-indigo-100">
                      {formatDuration(a.duration_minutes)}
                    </span>
                  </div>
                </div>

                {a.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-line leading-relaxed">
                    {a.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {a.category}
                    </span>
                    {a.company_name && (
                      <span className="text-slate-600 text-[11px] truncate max-w-[120px]">
                        {a.company_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingActivity(a)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => setActivityToDelete(a)}
                      className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Date & Durée</th>
                <th className="py-3 px-4">Activité & Compte-rendu</th>
                <th className="py-3 px-4">Client / Mission</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Résultat & Prochaine action</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70">
                  {/* Date & Duration */}
                  <td className="py-3 px-4 font-mono text-slate-600 align-top whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{formatDateFr(a.activity_date)}</div>
                    {a.activity_time && <div className="text-[11px] text-slate-400">{a.activity_time.slice(0, 5)}</div>}
                    <div className="text-[11px] font-bold text-indigo-700 mt-1">
                      {formatDuration(a.duration_minutes)}
                    </div>
                  </td>

                  {/* Title & Description */}
                  <td className="py-3 px-4 align-top max-w-sm">
                    <div className="font-bold text-slate-900 text-xs">{a.title}</div>
                    {a.description && (
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                  </td>

                  {/* Client / Mission */}
                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    {a.contact_id ? (
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <button
                          onClick={() => onSelectContact(a.contact_id!)}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {a.company_name || a.contact_name}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Interne Matt Konnect</span>
                    )}

                    {a.mission_title && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{a.mission_title}</span>
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {a.category}
                    </span>
                  </td>

                  {/* Result & Next action */}
                  <td className="py-3 px-4 align-top max-w-xs">
                    {a.result && (
                      <div className="text-slate-700 text-xs">
                        <strong className="text-slate-900 font-semibold">Résultat : </strong>
                        {a.result}
                      </div>
                    )}
                    {a.next_action && (
                      <div className="text-indigo-700 text-[11px] mt-1 font-medium">
                        → {a.next_action}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditingActivity(a)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors"
                        title="Modifier cette activité"
                      >
                        <Pencil className="w-3 h-3 text-slate-500" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => setActivityToDelete(a)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded shadow-2xs transition-colors"
                        title="Supprimer cette entrée"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">Modifier l'activité</h3>
              </div>
              <button onClick={() => setEditingActivity(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de l'action *</label>
                <input
                  type="text"
                  required
                  value={editingActivity.title}
                  onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={editingActivity.category}
                    onChange={(e) => setEditingActivity({ ...editingActivity, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editingActivity.status}
                    onChange={(e) => setEditingActivity({ ...editingActivity, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="réalisé">Réalisé</option>
                    <option value="prévu">Prévu</option>
                    <option value="annulé">Annulé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durée (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editingActivity.duration_minutes}
                    onChange={(e) => setEditingActivity({ ...editingActivity, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingActivity.activity_date}
                    onChange={(e) => setEditingActivity({ ...editingActivity, activity_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client associé</label>
                  <select
                    value={editingActivity.contact_id || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, contact_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="">— Aucun (Interne) —</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mission liée</label>
                  <select
                    value={editingActivity.mission_id || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, mission_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="">— Aucune mission liée —</option>
                    {missions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.reference} · {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Compte rendu</label>
                <textarea
                  rows={3}
                  value={editingActivity.description || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Résultat</label>
                  <input
                    type="text"
                    value={editingActivity.result || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, result: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prochaine action</label>
                  <input
                    type="text"
                    value={editingActivity.next_action || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, next_action: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  {editSubmitting ? 'Enregistrement...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Activity Confirmation Modal */}
      {activityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer l'activité</h3>
                <p className="text-slate-500 text-[11px]">{activityToDelete.title}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Voulez-vous supprimer définitivement cette entrée du journal de travail ? Le temps passé associé ne sera plus comptabilisé.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
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
