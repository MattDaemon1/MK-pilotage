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
  DollarSign,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle
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

  // Modals for creation
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Forms for creation
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

  // Edit states
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceEditForm, setInvoiceEditForm] = useState<any>({});
  const [invoiceEditSubmitting, setInvoiceEditSubmitting] = useState(false);

  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quoteEditForm, setQuoteEditForm] = useState<any>({});
  const [quoteEditSubmitting, setQuoteEditSubmitting] = useState(false);

  // Delete states
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadFinances();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
    if (!quoteForm.contact_id) {
      setNotification({ type: 'error', message: 'Veuillez sélectionner un contact' });
      return;
    }
    try {
      await api.createQuote({
        ...quoteForm,
        contact_id: Number(quoteForm.contact_id),
        mission_id: quoteForm.mission_id ? Number(quoteForm.mission_id) : undefined,
        amount_ht: Number(quoteForm.amount_ht),
        tax_rate: Number(quoteForm.tax_rate)
      });
      setIsQuoteModalOpen(false);
      setNotification({ type: 'success', message: 'Devis créé avec succès.' });
      loadFinances();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la création du devis' });
    }
  };

  const handleOpenEditQuote = (q: Quote) => {
    setEditingQuote(q);
    setQuoteEditForm({
      contact_id: q.contact_id,
      mission_id: q.mission_id || '',
      amount_ht: q.amount_ht,
      tax_rate: q.tax_rate,
      issue_date: q.issue_date,
      validity_date: q.validity_date || '',
      status: q.status,
      notes: q.notes || ''
    });
  };

  const handleSaveQuoteEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote) return;
    setQuoteEditSubmitting(true);
    try {
      await api.updateQuote(editingQuote.id, {
        ...quoteEditForm,
        contact_id: Number(quoteEditForm.contact_id),
        mission_id: quoteEditForm.mission_id ? Number(quoteEditForm.mission_id) : null,
        amount_ht: Number(quoteEditForm.amount_ht),
        tax_rate: Number(quoteEditForm.tax_rate)
      });
      setEditingQuote(null);
      setNotification({ type: 'success', message: `Devis ${editingQuote.quote_number} modifié avec succès.` });
      loadFinances();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la modification' });
    } finally {
      setQuoteEditSubmitting(false);
    }
  };

  const handleConfirmDeleteQuote = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteQuote(quoteToDelete.id);
      setNotification({ type: 'success', message: `Devis ${quoteToDelete.quote_number} supprimé.` });
      setQuoteToDelete(null);
      loadFinances();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la suppression' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.contact_id) {
      setNotification({ type: 'error', message: 'Veuillez sélectionner un contact' });
      return;
    }
    try {
      await api.createInvoice({
        ...invoiceForm,
        contact_id: Number(invoiceForm.contact_id),
        mission_id: invoiceForm.mission_id ? Number(invoiceForm.mission_id) : undefined,
        amount_ht: Number(invoiceForm.amount_ht),
        tax_rate: Number(invoiceForm.tax_rate)
      });
      setIsInvoiceModalOpen(false);
      setNotification({ type: 'success', message: 'Facture émise avec succès.' });
      loadFinances();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la création de la facture' });
    }
  };

  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvoiceEditForm({
      contact_id: inv.contact_id,
      mission_id: inv.mission_id || '',
      amount_ht: inv.amount_ht,
      tax_rate: inv.tax_rate,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      payment_status: inv.payment_status,
      notes: inv.notes || ''
    });
  };

  const handleSaveInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setInvoiceEditSubmitting(true);
    try {
      await api.updateInvoice(editingInvoice.id, {
        ...invoiceEditForm,
        contact_id: Number(invoiceEditForm.contact_id),
        mission_id: invoiceEditForm.mission_id ? Number(invoiceEditForm.mission_id) : null,
        amount_ht: Number(invoiceEditForm.amount_ht),
        tax_rate: Number(invoiceEditForm.tax_rate)
      });
      setEditingInvoice(null);
      setNotification({ type: 'success', message: `Facture ${editingInvoice.invoice_number} mise à jour avec succès.` });
      loadFinances();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la modification' });
    } finally {
      setInvoiceEditSubmitting(false);
    }
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteInvoice(invoiceToDelete.id);
      setNotification({ type: 'success', message: `Facture ${invoiceToDelete.invoice_number} et ses règlements ont été supprimés.` });
      setInvoiceToDelete(null);
      loadFinances();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la suppression' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoice_id) {
      setNotification({ type: 'error', message: 'Veuillez sélectionner une facture' });
      return;
    }
    try {
      await api.recordPayment({
        ...paymentForm,
        invoice_id: Number(paymentForm.invoice_id),
        amount: Number(paymentForm.amount)
      });
      setIsPaymentModalOpen(false);
      setNotification({ type: 'success', message: 'Règlement enregistré avec succès.' });
      loadFinances();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de l\'enregistrement' });
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    setIsDeleting(true);
    try {
      await api.deletePayment(paymentToDelete.id);
      setNotification({ type: 'success', message: 'Règlement supprimé. Statut de facture recalculé.' });
      setPaymentToDelete(null);
      loadFinances();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la suppression' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Devis, Factures & Encaissements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi commercial et trésorerie réelle · Modification, édition de factures et règlements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsQuoteModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
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
            className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs"
          >
            + Enregistrer règlement
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
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === 'invoices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Factures émises ({invoices.length})
          </button>
          <button
            onClick={() => setActiveSubTab('quotes')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === 'quotes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Devis ({quotes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('payments')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === 'payments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historique règlements ({payments.length})
          </button>
        </div>
      </div>

      {/* Invoices List */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Réf. Facture</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Émission</th>
                <th className="py-3 px-4">Échéance</th>
                <th className="py-3 px-4">Total TTC</th>
                <th className="py-3 px-4">Encaissé</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune facture émise pour le moment.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
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
                    <td className="py-3 px-4 font-mono text-slate-500">{formatDateFr(inv.issue_date)}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{formatDateFr(inv.due_date)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatEuro(inv.amount_ttc)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">{formatEuro(inv.paid_amount || 0)}</td>
                    <td className="py-3 px-4 font-medium">
                      <span
                        className={
                          inv.payment_status === 'payé'
                            ? 'text-emerald-700'
                            : inv.payment_status === 'en retard'
                            ? 'text-red-700 font-bold'
                            : 'text-amber-700'
                        }
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
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
                            className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                            title="Encaisser un paiement"
                          >
                            Encaisser
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors"
                          title="Modifier cette facture"
                        >
                          <Pencil className="w-3 h-3 text-slate-500" />
                          <span>Modifier</span>
                        </button>

                        <button
                          onClick={() => setInvoiceToDelete(inv)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded shadow-2xs transition-colors"
                          title="Supprimer cette facture"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Quotes List */}
      {activeSubTab === 'quotes' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
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
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucun devis enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
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
                      <span className={q.status === 'accepté' ? 'text-emerald-700 font-semibold' : 'text-slate-600'}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditQuote(q)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors"
                          title="Modifier ce devis"
                        >
                          <Pencil className="w-3 h-3 text-slate-500" />
                          <span>Modifier</span>
                        </button>

                        <button
                          onClick={() => setQuoteToDelete(q)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded shadow-2xs transition-colors"
                          title="Supprimer ce devis"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments List */}
      {activeSubTab === 'payments' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Facture</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4 text-right">Montant Encaissé</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Aucun encaissement enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-500">{formatDateFr(p.payment_date)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.invoice_number}</td>
                    <td className="py-3 px-4">{p.company_name || p.contact_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.payment_method}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{p.reference || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      {formatEuro(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setPaymentToDelete(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded shadow-2xs transition-colors"
                        title="Supprimer ce règlement"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                        <span>Supprimer</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
                    step="1"
                    value={quoteForm.tax_rate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, tax_rate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'émission</label>
                  <input
                    type="date"
                    required
                    value={quoteForm.issue_date}
                    onChange={(e) => setQuoteForm({ ...quoteForm, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date limite de validité</label>
                  <input
                    type="date"
                    value={quoteForm.validity_date}
                    onChange={(e) => setQuoteForm({ ...quoteForm, validity_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                <select
                  value={quoteForm.status}
                  onChange={(e) => setQuoteForm({ ...quoteForm, status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="envoyé">Envoyé</option>
                  <option value="accepté">Accepté / Signé</option>
                  <option value="refusé">Refusé</option>
                  <option value="expiré">Expiré</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Conditions</label>
                <textarea
                  rows={2}
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
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
                  Créer devis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Quote */}
      {editingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Modifier le devis ({editingQuote.quote_number})
                </h3>
              </div>
              <button onClick={() => setEditingQuote(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveQuoteEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client *</label>
                <select
                  required
                  value={quoteEditForm.contact_id}
                  onChange={(e) => setQuoteEditForm({ ...quoteEditForm, contact_id: e.target.value })}
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
                <label className="block font-semibold text-slate-700 mb-1">Mission associée</label>
                <select
                  value={quoteEditForm.mission_id}
                  onChange={(e) => setQuoteEditForm({ ...quoteEditForm, mission_id: e.target.value })}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant HT (€) *</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={quoteEditForm.amount_ht}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, amount_ht: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Taux TVA (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={quoteEditForm.tax_rate}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, tax_rate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'émission</label>
                  <input
                    type="date"
                    required
                    value={quoteEditForm.issue_date}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date limite validité</label>
                  <input
                    type="date"
                    value={quoteEditForm.validity_date}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, validity_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                <select
                  value={quoteEditForm.status}
                  onChange={(e) => setQuoteEditForm({ ...quoteEditForm, status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="envoyé">Envoyé</option>
                  <option value="accepté">Accepté / Signé</option>
                  <option value="refusé">Refusé</option>
                  <option value="expiré">Expiré</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={quoteEditForm.notes}
                  onChange={(e) => setQuoteEditForm({ ...quoteEditForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingQuote(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={quoteEditSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  {quoteEditSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Quote Confirmation Modal */}
      {quoteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer le devis</h3>
                <p className="text-slate-500 text-[11px]">{quoteToDelete.quote_number}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer définitivement ce devis ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuoteToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteQuote}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-xs"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Invoice */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Émettre une nouvelle facture</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client facturé *</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Mission concernée</label>
                <select
                  value={invoiceForm.mission_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, mission_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">— Facturation hors mission —</option>
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
                    step="1"
                    value={invoiceForm.tax_rate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'émission</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.issue_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'échéance (Paiement)</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statut initial</label>
                <select
                  value={invoiceForm.payment_status}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="à payer">À payer (Non encaissé)</option>
                  <option value="payé">Déjà payé comptant</option>
                </select>
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

      {/* Modal: Edit Invoice */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Modifier la facture ({editingInvoice.invoice_number})
                </h3>
              </div>
              <button onClick={() => setEditingInvoice(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveInvoiceEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client *</label>
                <select
                  required
                  value={invoiceEditForm.contact_id}
                  onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, contact_id: e.target.value })}
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
                <label className="block font-semibold text-slate-700 mb-1">Mission associée</label>
                <select
                  value={invoiceEditForm.mission_id}
                  onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, mission_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">— Facturation hors mission —</option>
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
                    value={invoiceEditForm.amount_ht}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, amount_ht: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Taux TVA (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={invoiceEditForm.tax_rate}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, tax_rate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'émission</label>
                  <input
                    type="date"
                    required
                    value={invoiceEditForm.issue_date}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    required
                    value={invoiceEditForm.due_date}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statut paiement</label>
                <select
                  value={invoiceEditForm.payment_status}
                  onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, payment_status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="à payer">À payer</option>
                  <option value="partiellement payé">Partiellement payé</option>
                  <option value="payé">Payé intégralement</option>
                  <option value="en retard">En retard</option>
                  <option value="annulée">Annulée</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={invoiceEditForm.notes}
                  onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={invoiceEditSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  {invoiceEditSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer la facture</h3>
                <p className="text-slate-500 text-[11px]">{invoiceToDelete.invoice_number}</p>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1">
              <p className="font-semibold text-xs">Suppression en cascade :</p>
              <p className="text-[11px] text-red-700">
                La suppression de cette facture supprimera également l'ensemble des règlements qui y sont rattachés.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteInvoice}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-xs"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Modal */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer ce règlement</h3>
                <p className="text-slate-500 text-[11px]">
                  Facture {paymentToDelete.invoice_number} · Montant : {formatEuro(paymentToDelete.amount)}
                </p>
              </div>
            </div>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer ce paiement ? Le montant payé et le statut de la facture concernée seront automatiquement réajustés.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeletePayment}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-xs"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer ce règlement'}
              </button>
            </div>
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
