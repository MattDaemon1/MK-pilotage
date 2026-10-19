import React, { useState, useEffect } from 'react';
import { X, Clock, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api.ts';
import { Contact, Mission, ActivityCategory } from '../types/crm.ts';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialContactId?: number;
  initialMissionId?: number;
}

const CATEGORIES: ActivityCategory[] = [
  'Développement',
  'Maintenance',
  'Appel',
  'Email',
  'Rendez-vous',
  'Audit de site',
  'Mise à jour WordPress',
  'Correction bug',
  'Réunion de cadrage',
  'Prospection',
  'Conseil',
  'Formation',
  'Livraison',
  'Compte rendu',
  'Administration',
  'Autre'
];

const PRESET_DURATIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1h30', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
];

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialContactId,
  initialMissionId
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<Mission[]>([]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Développement');
  const [contactId, setContactId] = useState<number | ''>(initialContactId || '');
  const [missionId, setMissionId] = useState<number | ''>(initialMissionId || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activityTime, setActivityTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (initialContactId) setContactId(initialContactId);
      if (initialMissionId) setMissionId(initialMissionId);
      setError(null);
    }
  }, [isOpen, initialContactId, initialMissionId]);

  const loadInitialData = async () => {
    try {
      const [allContacts, allMissions] = await Promise.all([
        api.getContacts(),
        api.getMissions()
      ]);
      setContacts(allContacts);
      setMissions(allMissions);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!contactId) {
      setFilteredMissions(missions);
    } else {
      setFilteredMissions(missions.filter(m => m.contact_id === Number(contactId)));
    }
  }, [contactId, missions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Veuillez renseigner le titre de ce que vous venez de faire.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createActivity({
        title: title.trim(),
        description: description.trim() || null,
        activity_date: activityDate,
        activity_time: activityTime || null,
        contact_id: contactId ? Number(contactId) : null,
        mission_id: missionId ? Number(missionId) : null,
        category,
        duration_minutes: Number(durationMinutes) || 0,
        status: 'réalisé',
        result: result.trim() || null,
        next_action: nextAction.trim() || null
      });

      // Reset
      setTitle('');
      setDescription('');
      setResult('');
      setNextAction('');
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Consigner mon travail
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enregistrement ultra-rapide d'une action ou intervention technique
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Ce que vous venez de faire <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: Correction bug formulaire, mise à jour ACF Pro, appel de cadrage..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Quick presets for duration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Temps passé
              </label>
              <span className="text-xs font-mono tabular-nums text-indigo-700 font-medium">
                {durationMinutes} min ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_DURATIONS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => setDurationMinutes(preset.minutes)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    durationMinutes === preset.minutes
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs font-mono border border-slate-300 rounded text-right focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500">min</span>
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Catégorie de prestation
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    category === cat
                      ? 'bg-indigo-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Client & Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Client / Contact (Optionnel)
              </label>
              <select
                value={contactId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  setContactId(val);
                  setMissionId('');
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">— Action interne / Sans client —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name} [{c.status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Mission liée (Optionnel)
              </label>
              <select
                value={missionId}
                onChange={(e) => setMissionId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">— Hors mission —</option>
                {filteredMissions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.reference} · {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Heure
              </label>
              <input
                type="time"
                value={activityTime}
                onChange={(e) => setActivityTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Details / Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Détails / Compte rendu rapide (Optionnel)
            </label>
            <textarea
              rows={2}
              placeholder="Explications techniques, points abordés, URLs testées..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Next Action */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Prochaine action à prévoir (Optionnel)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Envoyer compte rendu, planifier livraison de test..."
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer mon travail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
