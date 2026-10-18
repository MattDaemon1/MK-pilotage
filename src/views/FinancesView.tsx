import React, { useEffect, useState } from 'react';
import {
  ReceiptEuro,
  Plus,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign
} from 'lucide-react';
import { api, formatEuro, formatDateFr } from '../services/api.ts';
import { Quote, Invoice, Payment, Contact, Mission } from '../types/crm.ts';

interface FinancesViewProps {
  onSelectContact: (id: number) => void;
}

export const FinancesView: React.FC<FinancesViewProps> = ({ onSelectContact }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [summary, setSummary] = useState({
    signed_amount: 0,
    invoiced_amount: 0,
    collected_amount: 0,
    remaining_to_collect: 0,
    overdue_amount: 0,
    overdue_count: 0
  });
  const [loading, setLoading] = useState(true);

  // Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'quotes' | 'payments'>('invoices');

  // Modals
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Forms
  const [quoteForm, setQuoteForm] = useState({
    contact_id: '',
    mission_id: '',
    amount_ht: 1200,
    tax_rate: 20,
    issue_date: new Date().toISOString().split('T')[0],
    validity_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'envoyé' as any,
    notes: ''
  });

  const [invoiceForm, setInvoiceForm] = useState({
    contact_id: '',
    mission_id: '',
    amount_ht: 1200,
    tax_rate: 20,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    payment_status: 'à payer' as any,
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    amount: 500,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Virement',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadFinances();
  }, []);

  const loadFinances = async () => {
    setLoading(true);
    try {
      const [res, cts, mss] = await Promise.all([
        api.getFinances(),
        api.getContacts(),
        api.getMissions()
      ]);
      setQuotes(res.quotes);
      setInvoices(res.invoices);
      setPayments(res.payments);
      setSummary(res.summary);
      setContacts(cts);
      setMissions(mss);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.contact_id) return alert('Veuillez sélectionner un contact');
    try {
      await api.createQuote({
        ...quoteForm,
        contact_id: Number(quoteForm.contact_id),
        mission_id: quoteForm.mission_id ? Number(quoteForm.mission_id) : undefined,
        amount_ht: Number(quoteForm.amount_ht),
        tax_rate: Number(quoteForm.tax_rate)
      });
      setIsQuoteModalOpen(false);
      loadFinances();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.contact_id) return alert('Veuillez sélectionner un contact');
    try {
      await api.createInvoice({
        ...invoiceForm,
        contact_id: Number(invoiceForm.contact_id),
        mission_id: invoiceForm.mission_id ? Number(invoiceForm.mission_id) : undefined,
        amount_ht: Number(invoiceForm.amount_ht),
        tax_rate: Number(invoiceForm.tax_rate)
      });
      setIsInvoiceModalOpen(false);
      loadFinances();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoice_id) return alert('Veuillez sélectionner une facture');
    try {
      await api.recordPayment({
        ...paymentForm,
        invoice_id: Number(paymentForm.invoice_id),
        amount: Number(paymentForm.amount)
      });
      setIsPaymentModalOpen(false);
      loadFinances();
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
            Devis, Factures & Encaissements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi commercial et trésorerie réelle · Séparation stricte prévisionnel / facturé / encaissé
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuoteModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            + Nouveau devis
          </button>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            + Nouvelle facture
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            + Enregistrer règlement
          </button>
        </div>
      </div>

      {/* 5 Distinct Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">CA Signé (Devis)</div>
          <div className="text-xl font-bold font-mono tabular-nums text-indigo-700">
            {formatEuro(summary.signed_amount)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Devis validés & signés</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">CA Facturé (Émis)</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {formatEuro(summary.invoiced_amount)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Total TTC factures</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-xs font-medium text-emerald-700 mb-1">Encaissé Réel</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600">
            {formatEuro(summary.collected_amount)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sur compte bancaire</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-xs font-medium text-amber-700 mb-1">Reste à encaisser</div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-600">
            {formatEuro(summary.remaining_to_collect)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Facturé non encaissé</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-xs font-medium text-red-700 mb-1">Retards de paiement</div>
          <div className="text-xl font-bold font-mono tabular-nums text-red-600">
            {formatEuro(summary.overdue_amount)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{summary.overdue_count} facture(s) échue(s)</p>
        </div>
      </div>

      {/* Sub tabs: Factures vs Devis vs Règlements */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeSubTab === 'invoices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Factures émises ({invoices.length})
        </button>
        <button
          onClick={() => setActiveSubTab('quotes')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeSubTab === 'quotes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Devis ({quotes.length})
        </button>
        <button
          onClick={() => setActiveSubTab('payments')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeSubTab === 'payments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Règlements reçus ({payments.length})
        </button>
      </div>

      {/* Invoices List */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Réf. Facture</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Mission</th>
                <th className="py-3 px-4">Dates (Émise / Échéance)</th>
                <th className="py-3 px-4">Montant TTC</th>
                <th className="py-3 px-4">Encaissé</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onSelectContact(inv.contact_id)}
                      className="font-medium text-slate-800 hover:text-indigo-600"
                    >
                      {inv.company_name || inv.contact_name}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{inv.mission_title || '—'}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    <div>{formatDateFr(inv.issue_date)}</div>
                    <div className="text-slate-400">Échéance : {formatDateFr(inv.due_date)}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatEuro(inv.amount_ttc)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-600">{formatEuro(inv.paid_amount || 0)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`font-medium ${inv.payment_status === 'payé' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {inv.payment_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {inv.payment_status !== 'payé' && (
                      <button
                        onClick={() => {
                          setPaymentForm({
                            ...paymentForm,
                            invoice_id: String(inv.id),
                            amount: (inv.amount_ttc - (inv.paid_amount || 0))
                          });
                          setIsPaymentModalOpen(true);
                        }}
                        className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                      >
                        Encaisser
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quotes List */}
      {activeSubTab === 'quotes' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Réf. Devis</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Mission liée</th>
                <th className="py-3 px-4">Date émission</th>
                <th className="py-3 px-4">Montant HT</th>
                <th className="py-3 px-4">Montant TTC</th>
                <th className="py-3 px-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{q.quote_number}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onSelectContact(q.contact_id)}
                      className="font-medium text-slate-800 hover:text-indigo-600"
                    >
                      {q.company_name || q.contact_name}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{q.mission_title || '—'}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{formatDateFr(q.issue_date)}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{formatEuro(q.amount_ht)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatEuro(q.amount_ttc)}</td>
                  <td className="py-3 px-4 font-medium">
                    <span className={q.status === 'accepté' ? 'text-emerald-700' : 'text-slate-600'}>
                      {q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments List */}
      {activeSubTab === 'payments' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Facture</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4 text-right">Montant Encaissé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-500">{formatDateFr(p.payment_date)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.invoice_number}</td>
                  <td className="py-3 px-4">{p.company_name || p.contact_name}</td>
                  <td className="py-3 px-4 text-slate-600">{p.payment_method}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{p.reference || '—'}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                    {formatEuro(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: New Quote */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Enregistrer un devis</h3>
              <button onClick={() => setIsQuoteModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client *</label>
                <select
                  required
                  value={quoteForm.contact_id}
                  onChange={(e) => setQuoteForm({ ...quoteForm, contact_id: e.target.value })}
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
                <label className="block font-semibold text-slate-700 mb-1">Mission associée (Optionnelle)</label>
                <select
                  value={quoteForm.mission_id}
                  onChange={(e) => setQuoteForm({ ...quoteForm, mission_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">— Aucune / Nouveau projet —</option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.reference} · {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant HT (€) *</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={quoteForm.amount_ht}
                    onChange={(e) => setQuoteForm({ ...quoteForm, amount_ht: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Taux TVA (%)</label>
                  <input
                    type="number"
                    value={quoteForm.tax_rate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, tax_rate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date émission</label>
                  <input
                    type="date"
                    value={quoteForm.issue_date}
                    onChange={(e) => setQuoteForm({ ...quoteForm, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={quoteForm.status}
                    onChange={(e) => setQuoteForm({ ...quoteForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="envoyé">Envoyé</option>
                    <option value="accepté">Accepté</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="refusé">Refusé</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  Enregistrer devis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Invoice */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Enregistrer une facture</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client *</label>
                <select
                  required
                  value={invoiceForm.contact_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, contact_id: e.target.value })}
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
                <label className="block font-semibold text-slate-700 mb-1">Mission liée (Optionnelle)</label>
                <select
                  value={invoiceForm.mission_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, mission_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">— Hors mission / Récurrent —</option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.reference} · {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant HT (€) *</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={invoiceForm.amount_ht}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount_ht: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Taux TVA (%)</label>
                  <input
                    type="number"
                    value={invoiceForm.tax_rate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date émission</label>
                  <input
                    type="date"
                    value={invoiceForm.issue_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  Enregistrer facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Enregistrer un règlement reçu</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facture concernée *</label>
                <select
                  required
                  value={paymentForm.invoice_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, invoice_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">Sélectionner une facture</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} · {inv.company_name || inv.contact_name} ({formatEuro(inv.amount_ttc)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Montant encaissé (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date de paiement</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Moyen de paiement</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Virement">Virement bancaire</option>
                    <option value="Carte">Carte bancaire / Stripe</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Référence du virement / note</label>
                <input
                  type="text"
                  placeholder="Ex: VIR-2026-042"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                >
                  Valider l'encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
