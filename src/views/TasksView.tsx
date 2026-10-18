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
  CheckCircle2,
  Pencil,
  CheckCircle
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

  // New Task Modal
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

  // Edit Task Modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Task Modal
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeView]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
      setNotification({
        type: 'success',
        message: `Tâche marquée comme ${nextStatus}.`
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors du changement de statut'
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteTask(taskToDelete.id);
      setNotification({
        type: 'success',
        message: 'Tâche supprimée avec succès.'
      });
      setTaskToDelete(null);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setNotification({ type: 'error', message: 'Titre obligatoire' });
      return;
    }
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
      setNotification({ type: 'success', message: 'Tâche créée avec succès.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la création' });
    }
  };

  const handleOpenEdit = (t: Task) => {
    setEditingTask(t);
    setEditForm({
      title: t.title,
      description: t.description || '',
      due_date: t.due_date,
      priority: t.priority,
      task_type: t.task_type,
      status: t.status,
      contact_id: t.contact_id ? String(t.contact_id) : '',
      mission_id: t.mission_id ? String(t.mission_id) : '',
      contract_id: t.contract_id ? String(t.contract_id) : '',
      estimated_duration_minutes: t.estimated_duration_minutes || 30
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setEditSubmitting(true);
    try {
      await api.updateTask(editingTask.id, {
        ...editForm,
        contact_id: editForm.contact_id ? Number(editForm.contact_id) : null,
        mission_id: editForm.mission_id ? Number(editForm.mission_id) : null,
        contract_id: editForm.contract_id ? Number(editForm.contract_id) : null,
        estimated_duration_minutes: Number(editForm.estimated_duration_minutes)
      });
      setEditingTask(null);
      setNotification({ type: 'success', message: 'Tâche mise à jour avec succès.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la modification' });
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Tâches & Prochaines échéances
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Relances, interventions techniques, livrables et gestion des priorités
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

      {/* Views Segmented Filter */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto">
        {[
          { id: 'today', label: "Aujourd'hui" },
          { id: 'overdue', label: 'En retard' },
          { id: 'this_week', label: 'Cette semaine' },
          { id: 'upcoming', label: 'À venir' },
          { id: 'done', label: 'Terminées' },
          { id: 'all', label: 'Toutes' }
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id as any)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeView === v.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">Aucune tâche dans cette vue</h3>
          <p className="text-xs text-slate-500 mt-1">Vous êtes à jour dans vos échéances.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const isCompleted = t.status === 'terminée';
            const isOverdue = t.due_date < new Date().toISOString().split('T')[0] && !isCompleted;

            return (
              <div
                key={t.id}
                className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-4 transition-colors shadow-2xs ${
                  isCompleted ? 'border-slate-100 bg-slate-50/50 opacity-70' : isOverdue ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggle(t)}
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-indigo-600 bg-white'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.priority === 'haute' && (
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded">
                          Urgent
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded capitalize">
                        {t.task_type}
                      </span>
                    </div>

                    {/* Metadata Links */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                      {t.company_name || t.contact_name ? (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <button
                            onClick={() => onSelectContact(t.contact_id!)}
                            className="hover:text-indigo-600 underline-offset-2 hover:underline"
                          >
                            {t.company_name || t.contact_name}
                          </button>
                        </span>
                      ) : null}

                      {t.mission_title && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span>{t.mission_title}</span>
                        </span>
                      )}

                      {t.contract_title && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <FileCheck2 className="w-3 h-3 text-slate-400" />
                          <span>{t.contract_title}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Date & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right font-mono tabular-nums text-xs mr-2">
                    <div className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                      {formatDateFr(t.due_date)}
                    </div>
                    {t.estimated_duration_minutes > 0 && (
                      <div className="text-[10px] text-slate-400">
                        ~ {t.estimated_duration_minutes} min
                      </div>
                    )}
                  </div>

                  {/* Modifier */}
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Modifier la tâche"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Supprimer */}
                  <button
                    onClick={() => setTaskToDelete(t)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer la tâche"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
                    onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="haute">Haute (Urgent)</option>
                    <option value="normale">Normale</option>
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
                    <option value="relance">Relance commerciale</option>
                    <option value="rdv">Réunion / Appel</option>
                    <option value="technique">Développement / Technique</option>
                    <option value="administratif">Administration / Compta</option>
                    <option value="livraison">Livraison</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durée estimée (minutes)</label>
                  <input
                    type="number"
                    step="15"
                    value={form.estimated_duration_minutes}
                    onChange={(e) => setForm({ ...form, estimated_duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact associé (Optionnel)</label>
                <select
                  value={form.contact_id}
                  onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">— Aucun contact associé —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mission associée (Optionnelle)</label>
                <select
                  value={form.mission_id}
                  onChange={(e) => setForm({ ...form, mission_id: e.target.value })}
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Précisions</label>
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

      {/* Modal: Edit Task */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">Modifier la tâche</h3>
              </div>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de la tâche *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    required
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="à faire">À faire</option>
                    <option value="en cours">En cours</option>
                    <option value="terminée">Terminée</option>
                    <option value="annulée">Annulée</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priorité</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="haute">Haute (Urgent)</option>
                    <option value="normale">Normale</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durée estimée (min)</label>
                  <input
                    type="number"
                    step="15"
                    value={editForm.estimated_duration_minutes}
                    onChange={(e) => setEditForm({ ...editForm, estimated_duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact associé</label>
                <select
                  value={editForm.contact_id}
                  onChange={(e) => setEditForm({ ...editForm, contact_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">— Aucun contact —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mission associée</label>
                <select
                  value={editForm.mission_id}
                  onChange={(e) => setEditForm({ ...editForm, mission_id: e.target.value })}
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
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

      {/* Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer la tâche</h3>
                <p className="text-slate-500 text-[11px]">{taskToDelete.title}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
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
