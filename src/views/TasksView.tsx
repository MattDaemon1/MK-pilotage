import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar,
  AlertTriangle,
  Building2,
  Briefcase,
  FileCheck2,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { api, formatDateFr } from '../services/api.ts';
import { Task, Contact, Mission, Contract, TaskPriority, TaskStatus } from '../types/crm.ts';

interface TasksViewProps {
  onSelectContact: (id: number) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onSelectContact }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'today' | 'overdue' | 'this_week' | 'upcoming' | 'done' | 'all'>('today');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'normale' as TaskPriority,
    task_type: 'technique',
    contact_id: '',
    mission_id: '',
    contract_id: '',
    estimated_duration_minutes: 30
  });

  useEffect(() => {
    loadData();
  }, [activeView]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ts, cts, mss, ctrs] = await Promise.all([
        api.getTasks({ view: activeView }),
        api.getContacts(),
        api.getMissions(),
        api.getContracts()
      ]);
      setTasks(ts);
      setContacts(cts);
      setMissions(mss);
      setContracts(ctrs.contracts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (t: Task) => {
    const nextStatus = t.status === 'terminée' ? 'à faire' : 'terminée';
    try {
      await api.updateTask(t.id, { status: nextStatus });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    try {
      await api.deleteTask(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return alert('Titre obligatoire');
    try {
      await api.createTask({
        ...form,
        contact_id: form.contact_id ? Number(form.contact_id) : undefined,
        mission_id: form.mission_id ? Number(form.mission_id) : undefined,
        contract_id: form.contract_id ? Number(form.contract_id) : undefined,
        estimated_duration_minutes: Number(form.estimated_duration_minutes)
      });
      setIsModalOpen(false);
      setForm({
        title: '',
        description: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'normale',
        task_type: 'technique',
        contact_id: '',
        mission_id: '',
        contract_id: '',
        estimated_duration_minutes: 30
      });
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
            Tâches, Échéances & Relances
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organisation quotidienne des relances commerciales, livrables et contrôles
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle tâche</span>
        </button>
      </div>

      {/* 5 Views Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto w-fit">
        {[
          { id: 'today', label: 'Aujourd\'hui' },
          { id: 'overdue', label: 'En retard' },
          { id: 'this_week', label: 'Cette semaine' },
          { id: 'upcoming', label: 'À venir' },
          { id: 'done', label: 'Terminées' },
          { id: 'all', label: 'Toutes' }
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id as any)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeView === v.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg border border-slate-200" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Aucune tâche dans cette vue</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Vous êtes à jour ! Créez une nouvelle tâche ou consultez les autres filtres.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Créer une tâche
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
          {tasks.map((t) => (
            <div
              key={t.id}
              className={`p-4 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors ${
                t.status === 'terminée' ? 'opacity-60 bg-slate-50/40' : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={t.status === 'terminée'}
                  onChange={() => handleToggle(t)}
                  className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${t.status === 'terminée' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {t.title}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded uppercase ${
                      t.priority === 'urgente'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : t.priority === 'haute'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.priority}
                    </span>
                    <span className="text-[11px] text-slate-400">· {t.task_type}</span>
                  </div>

                  {t.description && (
                    <p className="text-xs text-slate-600 max-w-2xl">{t.description}</p>
                  )}

                  {/* Related entities */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                    {t.contact_id && (
                      <button
                        onClick={() => onSelectContact(t.contact_id!)}
                        className="hover:text-indigo-600 flex items-center gap-1 font-medium"
                      >
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{t.company_name || t.contact_name}</span>
                      </button>
                    )}
                    {t.mission_title && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>Mission : {t.mission_title}</span>
                      </span>
                    )}
                    {t.contract_title && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <FileCheck2 className="w-3 h-3 text-slate-400" />
                        <span>Contrat : {t.contract_title}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Date & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right font-mono tabular-nums text-xs">
                  <div className="font-semibold text-slate-800">
                    {formatDateFr(t.due_date)}
                  </div>
                  {t.estimated_duration_minutes > 0 && (
                    <div className="text-[10px] text-slate-400">
                      ~ {t.estimated_duration_minutes} min
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Créer une tâche</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de la tâche *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Relancer devis Atelier Bois, mettre à jour PHP..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priorité</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type de tâche</label>
                  <select
                    value={form.task_type}
                    onChange={(e) => setForm({ ...form, task_type: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="relance_commerciale">Relance commerciale</option>
                    <option value="technique">Technique / Dev</option>
                    <option value="livraison">Livraison client</option>
                    <option value="renouvellement">Renouvellement contrat</option>
                    <option value="paiement">Suivi paiement</option>
                    <option value="administratif">Administratif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durée estimée (min)</label>
                  <input
                    type="number"
                    step="5"
                    value={form.estimated_duration_minutes}
                    onChange={(e) => setForm({ ...form, estimated_duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client associé (Optionnel)</label>
                <select
                  value={form.contact_id}
                  onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">— Action interne / Sans client —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
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
