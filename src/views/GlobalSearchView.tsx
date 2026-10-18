import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  Briefcase,
  FileCheck2,
  BookOpen,
  CheckSquare,
  ReceiptEuro,
  ArrowRight
} from 'lucide-react';
import { api, formatEuro, formatDateFr } from '../services/api.ts';

interface GlobalSearchViewProps {
  onSelectContact: (id: number) => void;
}

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({ onSelectContact }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<{
    contacts: any[];
    missions: any[];
    contracts: any[];
    activities: any[];
    tasks: any[];
    invoices: any[];
  }>({
    contacts: [],
    missions: [],
    contracts: [],
    activities: [],
    tasks: [],
    invoices: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults({ contacts: [], missions: [], contracts: [], activities: [], tasks: [], invoices: [] });
      return;
    }
    const timer = setTimeout(() => {
      performSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const performSearch = async (term: string) => {
    setLoading(true);
    try {
      const res = await api.globalSearch(term);
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalResults =
    results.contacts.length +
    results.missions.length +
    results.contracts.length +
    results.activities.length +
    results.tasks.length +
    results.invoices.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Recherche globale
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Retrouvez instantanément une entreprise, un contact, une mission, un contrat, une facture ou une action
        </p>
      </div>

      {/* Big Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          autoFocus
          placeholder="Tapez un mot-clé (ex: Bois, WordPress, FAC-2026, devis, Delorme, audit...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-xl shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Recherche en cours...</div>
      ) : !searchTerm.trim() ? (
        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
          Entrez un terme pour lancer la recherche transversale.
        </div>
      ) : totalResults === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
          Aucun résultat trouvé pour « {searchTerm} ».
        </div>
      ) : (
        <div className="space-y-6">
          {/* Contacts */}
          {results.contacts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Contacts & Entreprises ({results.contacts.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {results.contacts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectContact(c.id)}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {c.contact_name} {c.company_name ? `· ${c.company_name}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.email} {c.phone ? `· ${c.phone}` : ''} {c.city ? `· ${c.city}` : ''}
                      </div>
                    </div>
                    <span className="text-[11px] text-indigo-600 font-medium capitalize">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missions */}
          {results.missions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Missions & Projets ({results.missions.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {results.missions.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {m.reference} · {m.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Client : {m.company_name || m.contact_name} · Statut : {m.status}
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-800">
                      {formatEuro(m.accepted_amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Factures */}
          {results.invoices.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ReceiptEuro className="w-4 h-4 text-emerald-600" />
                Factures ({results.invoices.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {results.invoices.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 font-mono">
                        {inv.invoice_number}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Client : {inv.company_name || inv.contact_name} · Émise le {formatDateFr(inv.issue_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-900">{formatEuro(inv.amount_ttc)}</div>
                      <div className="text-[10px] text-slate-500">{inv.payment_status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activités */}
          {results.activities.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Journal d'activités ({results.activities.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {results.activities.map((a) => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {a.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {a.category} · {a.company_name || a.contact_name || 'Interne'}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-600">
                      {formatDateFr(a.activity_date)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tâches */}
          {results.tasks.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                Tâches & Relances ({results.tasks.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {results.tasks.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t.company_name || t.contact_name || 'Général'} · Statut : {t.status}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-600">
                      Échéance : {formatDateFr(t.due_date)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
