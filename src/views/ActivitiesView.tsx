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
  Briefcase
} from 'lucide-react';
import { api, formatDateFr, formatDuration } from '../services/api.ts';
import { Activity, Contact, Mission } from '../types/crm.ts';

interface ActivitiesViewProps {
  onOpenQuickLog: () => void;
  onSelectContact: (id: number) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  onOpenQuickLog,
  onSelectContact
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('toutes');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Edit modal
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedContact, selectedCategory, searchQuery, startDate, endDate]);

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

  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous supprimer cette entrée du journal de travail ?')) return;
    try {
      await api.deleteActivity(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    try {
      await api.updateActivity(editingActivity.id, editingActivity);
      setEditingActivity(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalMinutes = activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Journal de travail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Historique complet de toutes les actions, interventions techniques et échanges réalisés
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono tabular-nums text-slate-700">
            Total affiché : <strong className="text-indigo-700">{formatDuration(totalMinutes)}</strong> ({activities.length} entrées)
          </div>
          <button
            onClick={onOpenQuickLog}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Consigner mon travail</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Contact select */}
        <select
          value={selectedContact}
          onChange={(e) => setSelectedContact(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
        >
          <option value="">Tous les contacts</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
            </option>
          ))}
        </select>

        {/* Category select */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
        >
          <option value="toutes">Toutes les catégories</option>
          <option value="Développement">Développement</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Mise à jour WordPress">Mise à jour WordPress</option>
          <option value="Correction bug">Correction bug</option>
          <option value="Audit de site">Audit de site</option>
          <option value="Appel">Appel</option>
          <option value="Email">Email</option>
          <option value="Rendez-vous">Rendez-vous</option>
          <option value="Réunion de cadrage">Réunion de cadrage</option>
          <option value="Prospection">Prospection</option>
          <option value="Conseil">Conseil</option>
          <option value="Formation">Formation</option>
          <option value="Administration">Administration</option>
        </select>

        {/* Date From */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 font-mono border border-slate-200 rounded-lg"
          title="Date de début"
        />

        {/* Date To */}
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 font-mono border border-slate-200 rounded-lg"
          title="Date de fin"
        />
      </div>

      {/* Activities Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg border border-slate-200" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Aucune entrée trouvée</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Modifiez vos filtres ou enregistrez une nouvelle activité.
          </p>
          <button
            onClick={onOpenQuickLog}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Consigner mon travail
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {activities.map((a) => (
              <div
                key={a.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
              >
                {/* Main info */}
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{a.title}</span>
                    <span className="text-[11px] font-medium text-slate-500">· {a.category}</span>
                    {a.status !== 'réalisé' && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        [{a.status}]
                      </span>
                    )}
                  </div>

                  {/* Association */}
                  <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                    {a.contact_id ? (
                      <button
                        onClick={() => onSelectContact(a.contact_id!)}
                        className="hover:text-indigo-600 flex items-center gap-1 font-medium"
                      >
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{a.company_name ? `${a.company_name} (${a.contact_name})` : a.contact_name}</span>
                      </button>
                    ) : (
                      <span className="text-slate-400">Action interne</span>
                    )}

                    {a.mission_title && (
                      <span className="flex items-center gap-1 text-indigo-700 font-medium">
                        <Briefcase className="w-3 h-3 text-indigo-400" />
                        <span>{a.mission_reference ? `${a.mission_reference} · ` : ''}{a.mission_title}</span>
                      </span>
                    )}
                  </div>

                  {/* Description / Notes */}
                  {a.description && (
                    <p className="text-slate-600 whitespace-pre-line leading-relaxed pt-1">
                      {a.description}
                    </p>
                  )}

                  {/* Result & Next action */}
                  {(a.result || a.next_action) && (
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px]">
                      {a.result && (
                        <span className="text-emerald-700">
                          <strong>Conclusion :</strong> {a.result}
                        </span>
                      )}
                      {a.next_action && (
                        <span className="text-indigo-700">
                          <strong>Suite :</strong> {a.next_action}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right metadata & actions */}
                <div className="flex items-center md:flex-col md:items-end justify-between gap-2 shrink-0">
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-sm font-bold text-slate-900">
                      {formatDuration(a.duration_minutes)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatDateFr(a.activity_date)} {a.activity_time ? `à ${a.activity_time}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => setEditingActivity(a)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                      title="Modifier cette activité"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Modifier l'activité</h3>
              <button onClick={() => setEditingActivity(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre</label>
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
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
