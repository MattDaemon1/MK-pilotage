import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  Briefcase,
  FileCheck2,
  ReceiptEuro,
  CheckSquare,
  UserCheck,
  Plus,
  Calendar,
  AlertCircle,
  FileText,
  Trash2,
  Archive,
  ArchiveRestore,
  Pencil,
  AlertTriangle,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { api, formatEuro, formatDateFr, formatDuration } from '../services/api.ts';
import { ContactDetailResponse, ContactStatus, Activity, Mission, Contract, Task, Quote, Invoice, Payment } from '../types/crm.ts';

interface ContactDetailViewProps {
  contactId: number;
  onBack: () => void;
  onOpenQuickLog: (contactId: number, missionId?: number) => void;
  onNavigateToMissions: () => void;
}

type TabKey =
  | 'overview'
  | 'activities'
  | 'missions'
  | 'contracts'
  | 'finances'
  | 'time'
  | 'tasks'
  | 'notes';

export const ContactDetailView: React.FC<ContactDetailViewProps> = ({
  contactId,
  onBack,
  onOpenQuickLog,
  onNavigateToMissions
}) => {
  const [data, setData] = useState<ContactDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Activity filter state within client hub
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('toutes');
  const [activityMissionFilter, setActivityMissionFilter] = useState<number | 'toutes'>('toutes');

  // Notification toast/banner state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Edit contact info modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete & convert & archive modals for contact
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isDeletingSubmitting, setIsDeletingSubmitting] = useState(false);
  const [isConvertingContact, setIsConvertingContact] = useState(false);
  const [isArchivingContact, setIsArchivingContact] = useState(false);

  // Activity modal states
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  // Mission modal states
  const [isNewMissionOpen, setIsNewMissionOpen] = useState(false);
  const [missionForm, setMissionForm] = useState({
    title: '',
    service_category: 'Refonte site web',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    estimated_amount: 1500,
    accepted_amount: 1500,
    time_budget_hours: 20
  });
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);

  // Contract modal states
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  // Quote modal states
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quoteEditForm, setQuoteEditForm] = useState<any>({});
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  // Invoice modal states
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceEditForm, setInvoiceEditForm] = useState<any>({});
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Payment modal states
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Task modal states
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'normale' as any,
    task_type: 'technique',
    estimated_duration_minutes: 30
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    setLoading(true);
    try {
      const res = await api.getContact(contactId);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du contact');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditContact = () => {
    if (!data?.contact) return;
    const c = data.contact;
    setEditForm({
      contact_name: c.contact_name || '',
      company_name: c.company_name || '',
      role_title: c.role_title || '',
      email: c.email || '',
      phone: c.phone || '',
      website: c.website || '',
      address: c.address || '',
      postal_code: c.postal_code || '',
      city: c.city || '',
      sector: c.sector || '',
      lead_source: c.lead_source || 'prospection',
      status: c.status || 'prospect',
      notes: c.notes || '',
      next_action: c.next_action || '',
      follow_up_date: c.follow_up_date || ''
    });
    setIsEditing(true);
  };

  const handleSaveContactEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      await api.updateContact(contactId, editForm);
      setIsEditing(false);
      setNotification({
        type: 'success',
        message: `Fiche de ${editForm.contact_name || 'contact'} mise à jour avec succès.`
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la mise à jour'
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleConfirmConvert = async () => {
    if (!data) return;
    try {
      await api.convertProspectToClient(contactId);
      setIsConvertingContact(false);
      setNotification({
        type: 'success',
        message: `"${data.contact.contact_name}" est désormais officiellement converti en Client !`
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la conversion'
      });
    }
  };

  const handleConfirmArchive = async () => {
    if (!data) return;
    const willArchive = data.contact.is_archived === 0;
    try {
      await api.archiveContact(contactId, willArchive);
      setIsArchivingContact(false);
      setNotification({
        type: 'success',
        message: willArchive
          ? `La fiche de ${data.contact.contact_name} a été archivée.`
          : `La fiche de ${data.contact.contact_name} a été désarchivée.`
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de l'archivage"
      });
    }
  };

  const handleDeleteContact = async (force: boolean = false) => {
    setIsDeletingSubmitting(true);
    try {
      await api.deleteContact(contactId, force);
      setIsDeletingContact(false);
      onBack();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression'
      });
      setIsDeletingContact(false);
    } finally {
      setIsDeletingSubmitting(false);
    }
  };

  // Activity CRUD
  const handleSaveActivityEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    try {
      await api.updateActivity(editingActivity.id, editingActivity);
      setEditingActivity(null);
      setNotification({
        type: 'success',
        message: 'Activité mise à jour avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la modification de l\'activité'
      });
    }
  };

  const handleConfirmDeleteActivity = async () => {
    if (!activityToDelete) return;
    try {
      await api.deleteActivity(activityToDelete.id);
      setActivityToDelete(null);
      setNotification({
        type: 'success',
        message: 'Activité supprimée du journal de travail.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression'
      });
    }
  };

  // Mission CRUD
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMission({
        ...missionForm,
        contact_id: contactId
      });
      setIsNewMissionOpen(false);
      setMissionForm({
        title: '',
        service_category: 'Refonte site web',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        estimated_amount: 1500,
        accepted_amount: 1500,
        time_budget_hours: 20
      });
      setNotification({
        type: 'success',
        message: 'Mission créée avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la création de la mission'
      });
    }
  };

  const handleSaveMissionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMission) return;
    try {
      const {
        invoiced_amount,
        collected_amount,
        billed_amount,
        paid_amount,
        actual_hours_spent,
        actual_minutes_spent,
        company_name,
        contact_name,
        contact_email,
        pending_tasks_count,
        ...payload
      } = editingMission as any;

      await api.updateMission(editingMission.id, {
        ...payload,
        closed_date: payload.status === 'clôturée' ? (payload.closed_date || payload.actual_close_date || new Date().toISOString().split('T')[0]) : null
      });
      setEditingMission(null);
      setNotification({
        type: 'success',
        message: 'Mission mise à jour avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la modification de la mission'
      });
    }
  };

  const handleConfirmDeleteMission = async () => {
    if (!missionToDelete) return;
    try {
      await api.deleteMission(missionToDelete.id);
      setMissionToDelete(null);
      setNotification({
        type: 'success',
        message: 'Mission supprimée avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression de la mission'
      });
    }
  };

  // Contract CRUD
  const handleSaveContractEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    try {
      const { company_name, contact_name, ...payload } = editingContract as any;
      await api.updateContract(editingContract.id, payload);
      setEditingContract(null);
      setNotification({
        type: 'success',
        message: 'Contrat mis à jour avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la modification du contrat'
      });
    }
  };

  const handleConfirmDeleteContract = async () => {
    if (!contractToDelete) return;
    try {
      await api.deleteContract(contractToDelete.id);
      setContractToDelete(null);
      setNotification({
        type: 'success',
        message: 'Contrat récurrent supprimé.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression'
      });
    }
  };

  // Finance: Quote CRUD
  const handleOpenEditQuote = (q: Quote) => {
    setEditingQuote(q);
    setQuoteEditForm({
      quote_number: q.quote_number,
      issue_date: q.issue_date,
      valid_until: q.valid_until || '',
      amount_ht: q.amount_ht,
      vat_rate: q.vat_rate,
      amount_ttc: q.amount_ttc,
      status: q.status,
      notes: q.notes || '',
      terms: q.terms || ''
    });
  };

  const handleSaveQuoteEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote) return;
    try {
      await api.updateQuote(editingQuote.id, {
        ...quoteEditForm,
        amount_ht: Number(quoteEditForm.amount_ht),
        vat_rate: Number(quoteEditForm.vat_rate),
        amount_ttc: Number(quoteEditForm.amount_ttc)
      });
      setEditingQuote(null);
      setNotification({
        type: 'success',
        message: `Devis "${quoteEditForm.quote_number}" mis à jour avec succès.`
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la mise à jour du devis'
      });
    }
  };

  const handleConfirmDeleteQuote = async () => {
    if (!quoteToDelete) return;
    try {
      await api.deleteQuote(quoteToDelete.id);
      setQuoteToDelete(null);
      setNotification({
        type: 'success',
        message: 'Devis supprimé avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression du devis'
      });
    }
  };

  // Finance: Invoice CRUD
  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvoiceEditForm({
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      amount_ht: inv.amount_ht,
      vat_rate: inv.vat_rate,
      amount_ttc: inv.amount_ttc,
      payment_status: inv.payment_status,
      notes: inv.notes || ''
    });
  };

  const handleSaveInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      await api.updateInvoice(editingInvoice.id, {
        ...invoiceEditForm,
        amount_ht: Number(invoiceEditForm.amount_ht),
        vat_rate: Number(invoiceEditForm.vat_rate),
        amount_ttc: Number(invoiceEditForm.amount_ttc)
      });
      setEditingInvoice(null);
      setNotification({
        type: 'success',
        message: `Facture "${invoiceEditForm.invoice_number}" mise à jour avec succès.`
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la mise à jour de la facture'
      });
    }
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      await api.deleteInvoice(invoiceToDelete.id);
      setInvoiceToDelete(null);
      setNotification({
        type: 'success',
        message: 'Facture et règlements rattachés supprimés.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression de la facture'
      });
    }
  };

  // Finance: Payment CRUD
  const handleConfirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await api.deletePayment(paymentToDelete.id);
      setPaymentToDelete(null);
      setNotification({
        type: 'success',
        message: 'Règlement supprimé avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression du règlement'
      });
    }
  };

  // Task CRUD
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTask({
        ...taskForm,
        contact_id: contactId
      });
      setIsNewTaskOpen(false);
      setTaskForm({
        title: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'normale',
        task_type: 'technique',
        estimated_duration_minutes: 30
      });
      setNotification({
        type: 'success',
        message: 'Tâche créée avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la création de la tâche'
      });
    }
  };

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await api.updateTask(editingTask.id, editingTask);
      setEditingTask(null);
      setNotification({
        type: 'success',
        message: 'Tâche mise à jour avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la modification de la tâche'
      });
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await api.deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      setNotification({
        type: 'success',
        message: 'Tâche supprimée avec succès.'
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression'
      });
    }
  };

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'terminée' ? 'à faire' : 'terminée';
    try {
      await api.updateTask(taskId, { status: newStatus });
      setNotification({
        type: 'success',
        message: `Tâche marquée comme ${newStatus}.`
      });
      loadContact();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la mise à jour de la tâche'
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
        <div className="h-28 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux contacts
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error || 'Contact non trouvé'}
        </div>
      </div>
    );
  }

  const { contact, metrics, activities, missions, contracts, quotes, invoices, payments, tasks } = data;

  const hasHistory = (contact.active_missions_count || 0) > 0 || (contact.active_contracts_count || 0) > 0 || invoices.length > 0;

  // Filter activities for this contact
  const filteredActivities = activities.filter((a) => {
    if (activityCategoryFilter !== 'toutes' && a.category !== activityCategoryFilter) return false;
    if (activityMissionFilter !== 'toutes' && a.mission_id !== Number(activityMissionFilter)) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top back & actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste des contacts</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {contact.status === 'prospect' && (
            <button
              onClick={() => setIsConvertingContact(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Convertir en Client</span>
            </button>
          )}

          <button
            onClick={() => onOpenQuickLog(contact.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Consigner une action</span>
          </button>

          {/* Modifier */}
          <button
            onClick={handleOpenEditContact}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
            <span>Modifier la fiche</span>
          </button>

          {/* Archiver / Désarchiver */}
          <button
            onClick={() => setIsArchivingContact(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs cursor-pointer"
            title={contact.is_archived ? "Désarchiver" : "Archiver"}
          >
            {contact.is_archived ? <ArchiveRestore className="w-3.5 h-3.5 text-amber-600" /> : <Archive className="w-3.5 h-3.5 text-slate-500" />}
            <span>{contact.is_archived ? 'Désarchiver' : 'Archiver'}</span>
          </button>

          {/* Supprimer */}
          <button
            onClick={() => setIsDeletingContact(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer</span>
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
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-base leading-none ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Contact Profile Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {contact.contact_name}
              </h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                contact.status === 'client'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : contact.status === 'prospect'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {contact.status === 'prospect' ? 'Prospect' : contact.status === 'client' ? 'Client' : contact.status}
              </span>
              {contact.is_archived === 1 && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Fiche archivée
                </span>
              )}
            </div>

            {contact.company_name && (
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{contact.company_name}</span>
                {contact.role_title && <span className="text-slate-400">· {contact.role_title}</span>}
                {contact.industry && <span className="text-slate-400">· {contact.industry}</span>}
              </div>
            )}

            {/* Quick Contact info */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-slate-900">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-slate-900">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {contact.website && (
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.website.replace('https://', '').replace('http://', '')}</span>
                </a>
              )}
              {contact.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.city} {contact.postal_code ? `(${contact.postal_code})` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next action spotlight box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg min-w-[240px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Prochaine action prévue
            </div>
            <div className="text-xs font-semibold text-slate-900">
              {contact.next_action || 'Aucune action planifiée'}
            </div>
            {contact.follow_up_date && (
              <div className="text-[11px] font-mono tabular-nums text-indigo-600 font-medium mt-1">
                Date de relance : {formatDateFr(contact.follow_up_date)}
              </div>
            )}
          </div>
        </div>

        {/* Top 6 Indicators Bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6 pt-4 border-t border-slate-100 text-center sm:text-left">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">CA Facturé</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {formatEuro(metrics.total_invoiced)}
            </div>
            <div className="text-[10px] text-emerald-600 font-mono">
              Encaissé : {formatEuro(metrics.total_collected)}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Missions en cours</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {formatEuro(metrics.running_missions_amount)}
            </div>
            <div className="text-[10px] text-slate-500">
              {metrics.active_missions_count} mission(s)
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Contrats actifs</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {metrics.active_contracts_count}
            </div>
            <div className="text-[10px] text-slate-500">
              Maintenance / Récurrent
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Temps passé total</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {metrics.total_hours_spent} h
            </div>
            <div className="text-[10px] text-slate-500">
              {activities.length} action(s)
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Dernière interaction</div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
              {metrics.last_interaction ? formatDateFr(metrics.last_interaction.activity_date) : 'Aucune'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {metrics.last_interaction?.title || '—'}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Solde dû</div>
            <div className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${metrics.balance_due > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {formatEuro(metrics.balance_due)}
            </div>
            <div className="text-[10px] text-slate-500">
              {metrics.balance_due > 0 ? 'En attente' : 'À jour'}
            </div>
          </div>
        </div>
      </div>

      {/* 8 Central Tabs Navigation */}
      <div className="border-b border-slate-200 -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="flex items-center gap-1 overflow-x-auto pb-px scrollbar-none">
          {[
            { id: 'overview', label: 'Vue d’ensemble' },
            { id: 'activities', label: `Journal d'activités (${activities.length})` },
            { id: 'missions', label: `Missions & projets (${missions.length})` },
            { id: 'contracts', label: `Contrats (${contracts.length})` },
            { id: 'finances', label: `Devis & factures (${quotes.length + invoices.length})` },
            { id: 'time', label: `Temps passé (${metrics.total_hours_spent}h)` },
            { id: 'tasks', label: `Tâches & échéances (${tasks.length})` },
            { id: 'notes', label: 'Notes & coordonnées' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Vue d'ensemble */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Missions in progress */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  Missions récentes
                </h3>
                <button
                  onClick={() => setIsNewMissionOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Nouvelle mission
                </button>
              </div>

              {missions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Aucune mission créée pour ce contact.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {missions.map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {m.reference} · {m.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {m.service_category} · Statut : <span className="font-medium text-slate-700">{m.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-xs font-semibold text-slate-900">
                            {formatEuro(m.accepted_amount || m.estimated_amount)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {m.actual_hours_spent || 0}h passées
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingMission(m)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title="Modifier la mission"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Tasks */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  Tâches à faire
                </h3>
                <button
                  onClick={() => setIsNewTaskOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Tâche
                </button>
              </div>

              {tasks.filter((t) => t.status !== 'terminée').length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Aucune tâche en attente.
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.filter((t) => t.status !== 'terminée').map((t) => (
                    <div
                      key={t.id}
                      className="p-2 border border-slate-100 rounded-lg hover:bg-slate-50 flex items-start justify-between gap-2"
                    >
                      <div
                        onClick={() => handleToggleTask(t.id, t.status)}
                        className="flex items-start gap-2 cursor-pointer flex-1 min-w-0"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-indigo-600"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-900 truncate">{t.title}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Échéance : {formatDateFr(t.due_date)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingTask(t)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                          title="Modifier tâche"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setTaskToDelete(t)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Supprimer tâche"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activities preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Dernières interventions consignées
              </h3>
              <button
                onClick={() => onOpenQuickLog(contactId)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Consigner action
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Aucune activité consignée pour ce contact.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activities.slice(0, 5).map((a) => (
                  <div key={a.id} className="py-2.5 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-900">{a.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {a.category} {a.mission_title ? `· Mission : ${a.mission_title}` : ''}
                      </div>
                      {a.description && (
                        <p className="text-xs text-slate-600 mt-1 max-w-2xl">{a.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-medium text-slate-700">
                          {formatDuration(a.duration_minutes)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDateFr(a.activity_date)}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingActivity(a)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title="Modifier activité"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Historique des activités */}
      {activeTab === 'activities' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Historique chronologique des activités
              </h3>
              <p className="text-[11px] text-slate-500">
                Toutes les interventions, appels, réunions et temps passés
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={activityCategoryFilter}
                onChange={(e) => setActivityCategoryFilter(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
              >
                <option value="toutes">Toutes les catégories</option>
                <option value="Développement">Développement</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Appel">Appel</option>
                <option value="Email">Email</option>
                <option value="Rendez-vous">Rendez-vous</option>
                <option value="Audit de site">Audit de site</option>
                <option value="Mise à jour WordPress">Mise à jour WordPress</option>
                <option value="Administration">Administration</option>
              </select>

              <button
                onClick={() => onOpenQuickLog(contactId)}
                className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
              >
                + Consigner
              </button>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Aucune activité correspondant aux filtres.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredActivities.map((a) => (
                <div key={a.id} className="py-3 flex items-start justify-between">
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">{a.title}</span>
                      <span className="text-[11px] text-slate-500">· {a.category}</span>
                      {a.mission_title && (
                        <span className="text-[11px] text-indigo-600 font-medium">· {a.mission_title}</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {a.description}
                      </p>
                    )}
                    {a.result && (
                      <div className="text-[11px] text-emerald-700 font-medium">
                        Résultat : {a.result}
                      </div>
                    )}
                    {a.next_action && (
                      <div className="text-[11px] text-indigo-700 font-medium">
                        Prochaine action : {a.next_action}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-800">
                        {formatDuration(a.duration_minutes)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {formatDateFr(a.activity_date)} {a.activity_time || ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingActivity(a)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title="Modifier cette activité"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setActivityToDelete(a)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Supprimer cette activité"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Missions et projets */}
      {activeTab === 'missions' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Missions & Projets ({missions.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Prestations ponctuelles ou projets de développement
              </p>
            </div>
            <button
              onClick={() => setIsNewMissionOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              + Nouvelle mission
            </button>
          </div>

          {missions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune mission rattachée à ce contact.
            </div>
          ) : (
            <div className="space-y-3">
              {missions.map((m) => (
                <div key={m.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {m.reference} · {m.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {m.service_category} · Statut : <span className="font-semibold text-slate-800">{m.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-xs font-bold text-slate-900">
                          {formatEuro(m.accepted_amount || m.estimated_amount)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Facturé : {formatEuro(m.billed_amount || 0)} · Encaissé : {formatEuro(m.paid_amount || 0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingMission(m)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                          title="Modifier la mission"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setMissionToDelete(m)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          title="Supprimer la mission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {m.description && (
                    <p className="text-xs text-slate-600 mt-2">{m.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                    <span className="font-mono">
                      Temps : {m.actual_hours_spent || 0}h passées / Budget : {m.time_budget_hours || 0}h
                    </span>
                    <button
                      onClick={() => onOpenQuickLog(contactId, m.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                    >
                      + Consigner du travail sur cette mission
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Contrats récurrents */}
      {activeTab === 'contracts' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Contrats récurrents ({contracts.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Abonnements de maintenance, hébergement et infogérance
              </p>
            </div>
          </div>

          {contracts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucun contrat récurrent actif pour ce contact.
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => (
                <div key={c.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {c.reference} · {c.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Fréquence : {c.frequency} · Statut : <span className="font-semibold text-emerald-700">{c.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-sm font-bold text-slate-900">
                          {formatEuro(c.amount_per_period)} / {c.frequency}
                        </div>
                        {c.next_renewal_date && (
                          <div className="text-[10px] text-amber-700">
                            Renouvellement : {formatDateFr(c.next_renewal_date)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingContract(c)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                          title="Modifier le contrat"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setContractToDelete(c)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          title="Supprimer le contrat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {c.description && (
                    <p className="text-xs text-slate-600 mt-2">{c.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Devis et factures */}
      {activeTab === 'finances' && (
        <div className="space-y-6">
          {/* Quotes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
              Devis émis ({quotes.length})
            </h3>
            {quotes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Aucun devis enregistré.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100">
                    <th className="py-2">Réf. Devis</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Mission</th>
                    <th className="py-2">Montant TTC</th>
                    <th className="py-2">Statut</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotes.map((q) => (
                    <tr key={q.id}>
                      <td className="py-2 font-mono font-medium text-slate-900">{q.quote_number}</td>
                      <td className="py-2 font-mono text-slate-600">{formatDateFr(q.issue_date)}</td>
                      <td className="py-2 text-slate-700">{q.mission_title || '—'}</td>
                      <td className="py-2 font-mono font-semibold text-slate-900">{formatEuro(q.amount_ttc)}</td>
                      <td className="py-2 font-medium">
                        <span className={q.status === 'accepté' ? 'text-emerald-700' : 'text-slate-600'}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditQuote(q)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                            title="Modifier ce devis"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setQuoteToDelete(q)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Supprimer ce devis"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
              Factures ({invoices.length})
            </h3>
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Aucune facture émise.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100">
                    <th className="py-2">Réf. Facture</th>
                    <th className="py-2">Date émission</th>
                    <th className="py-2">Échéance</th>
                    <th className="py-2">Montant TTC</th>
                    <th className="py-2">Encaissé</th>
                    <th className="py-2">Statut paiement</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                      <td className="py-2 font-mono text-slate-600">{formatDateFr(inv.issue_date)}</td>
                      <td className="py-2 font-mono text-slate-600">{formatDateFr(inv.due_date)}</td>
                      <td className="py-2 font-mono font-semibold text-slate-900">{formatEuro(inv.amount_ttc)}</td>
                      <td className="py-2 font-mono text-emerald-700 font-semibold">{formatEuro(inv.paid_amount || 0)}</td>
                      <td className="py-2 font-medium">
                        <span className={inv.payment_status === 'payé' ? 'text-emerald-700' : 'text-amber-700'}>
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditInvoice(inv)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                            title="Modifier cette facture"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setInvoiceToDelete(inv)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Supprimer cette facture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Payments */}
          {payments.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                Règlements reçus ({payments.length})
              </h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100">
                    <th className="py-2">Date</th>
                    <th className="py-2">Facture</th>
                    <th className="py-2">Mode</th>
                    <th className="py-2">Montant</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-mono text-slate-600">{formatDateFr(p.payment_date)}</td>
                      <td className="py-2 font-mono font-bold text-slate-900">{p.invoice_number}</td>
                      <td className="py-2 text-slate-600">{p.payment_method}</td>
                      <td className="py-2 font-mono font-bold text-emerald-600">{formatEuro(p.amount)}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => setPaymentToDelete(p)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          title="Supprimer ce règlement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Temps passé */}
      {activeTab === 'time' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Synthèse du temps passé sur ce client
              </h3>
              <p className="text-[11px] text-slate-500">
                Total : {metrics.total_hours_spent} heures réparties sur {activities.length} actions
              </p>
            </div>
            <button
              onClick={() => onOpenQuickLog(contactId)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              + Consigner du temps
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {activities.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{a.title}</div>
                  <div className="text-[11px] text-slate-500">{a.category} {a.mission_title ? `· ${a.mission_title}` : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right font-mono tabular-nums">
                    <div className="font-bold text-slate-900">{formatDuration(a.duration_minutes)}</div>
                    <div className="text-[10px] text-slate-400">{formatDateFr(a.activity_date)}</div>
                  </div>
                  <button
                    onClick={() => setEditingActivity(a)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                    title="Modifier"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Tâches et échéances */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Tâches & Relances associées
              </h3>
              <p className="text-[11px] text-slate-500">
                Suivi des livrables et des échéances
              </p>
            </div>
            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              + Nouvelle tâche
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune tâche associée à ce contact.
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 border rounded-lg flex items-center justify-between ${
                    t.status === 'terminée' ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={t.status === 'terminée'}
                      onChange={() => handleToggleTask(t.id, t.status)}
                      className="mt-0.5 rounded text-indigo-600 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate ${t.status === 'terminée' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Priorité : {t.priority} {t.mission_title ? `· Mission : ${t.mission_title}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono tabular-nums text-xs">
                      <div className={t.status === 'terminée' ? 'text-slate-400' : 'text-indigo-600 font-semibold'}>
                        {formatDateFr(t.due_date)}
                      </div>
                      <div className="text-[10px] text-slate-400">{t.status}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingTask(t)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                        title="Modifier tâche"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTaskToDelete(t)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Supprimer tâche"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 8: Notes et documents */}
      {activeTab === 'notes' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Notes générales & Informations détaillées
            </h3>
            <button
              onClick={handleOpenEditContact}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Modifier
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
            {contact.notes || 'Aucune note particulière enregistrée pour ce contact.'}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100 text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">Origine du lead :</span> {contact.lead_source}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Date de création :</span> {formatDateFr(contact.created_at)}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Adresse complète :</span> {contact.address || '—'}, {contact.postal_code || ''} {contact.city || ''}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Dernière mise à jour :</span> {formatDateFr(contact.updated_at)}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Contact */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Modifier la fiche contact / client</h3>
                <p className="text-[11px] text-slate-500">Mettez à jour les coordonnées, statuts et informations clés</p>
              </div>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveContactEdit} className="space-y-4">
              {/* Section 1: Identité */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider text-slate-400">Identité & Statut commercial</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nom du contact *</label>
                    <input
                      type="text"
                      required
                      value={editForm.contact_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nom de l'entreprise</label>
                    <input
                      type="text"
                      value={editForm.company_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Statut commercial</label>
                    <select
                      value={editForm.status || 'prospect'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="client">Client</option>
                      <option value="client_inactif">Client inactif</option>
                      <option value="partenaire">Partenaire</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fonction / Titre</label>
                    <input
                      type="text"
                      placeholder="Ex: Dirigeant, Responsable Marketing..."
                      value={editForm.role_title || ''}
                      onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Coordonnées & Activité */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Coordonnées & Secteur</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Adresse e-mail</label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Site Web</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={editForm.website || ''}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Secteur d'activité</label>
                    <input
                      type="text"
                      placeholder="Ex: E-commerce, Immobilier, BTP..."
                      value={editForm.sector || ''}
                      onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Origine du contact</label>
                    <select
                      value={editForm.lead_source || 'prospection'}
                      onChange={(e) => setEditForm({ ...editForm, lead_source: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="prospection">Prospection</option>
                      <option value="recommandation">Recommandation</option>
                      <option value="site web">Site web</option>
                      <option value="réseau">Réseau</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Adresse */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Localisation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-700 mb-1">Adresse</label>
                    <input
                      type="text"
                      placeholder="Numéro et nom de rue"
                      value={editForm.address || ''}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Code postal</label>
                    <input
                      type="text"
                      placeholder="Ex: 75001"
                      value={editForm.postal_code || ''}
                      onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Ville</label>
                    <input
                      type="text"
                      placeholder="Ex: Paris"
                      value={editForm.city || ''}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Suivi commercial & Notes */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Relance & Notes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Prochaine action</label>
                    <input
                      type="text"
                      placeholder="Ex: Envoyer devis révisé, appeler pour démo..."
                      value={editForm.next_action || ''}
                      onChange={(e) => setEditForm({ ...editForm, next_action: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date de relance</label>
                    <input
                      type="date"
                      value={editForm.follow_up_date || ''}
                      onChange={(e) => setEditForm({ ...editForm, follow_up_date: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes générales</label>
                  <textarea
                    rows={3}
                    placeholder="Contexte, besoins spécifiques, historique particulier..."
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  {editSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Contact */}
      {isDeletingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Supprimer la fiche de {contact.contact_name}
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {contact.company_name || 'Contact'}
                </p>
              </div>
            </div>

            {hasHistory ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-2">
                <p className="font-medium">
                  Attention : ce contact possède des missions, contrats ou factures rattachées.
                </p>
                <p className="text-[11px]">
                  Il est vivement conseillé d'<strong>archiver</strong> la fiche pour conserver les bilans comptables. Si vous confirmez la suppression forcée, tout sera définitivement effacé.
                </p>
              </div>
            ) : (
              <p className="text-slate-600">
                Êtes-vous sûr de vouloir supprimer définitivement ce contact ? Cette action est irréversible.
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeletingContact(false)}
                className="w-full sm:w-auto px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              {hasHistory && (
                <button
                  type="button"
                  onClick={() => {
                    handleConfirmArchive();
                    setIsDeletingContact(false);
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium hover:bg-amber-100 cursor-pointer"
                >
                  Archiver plutôt
                </button>
              )}
              <button
                type="button"
                disabled={isDeletingSubmitting}
                onClick={() => handleDeleteContact(hasHistory)}
                className="w-full sm:w-auto px-3 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-xs cursor-pointer"
              >
                {isDeletingSubmitting ? 'Suppression...' : hasHistory ? 'Confirmer suppression forcée' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Convert Prospect */}
      {isConvertingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-emerald-600">
              <Sparkles className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Convertir en Client officiel
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {contact.contact_name} {contact.company_name ? `(${contact.company_name})` : ''}
                </p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 space-y-1 text-xs">
              <p className="font-semibold">Conversion sans doublon ni perte :</p>
              <p className="text-[11px] leading-relaxed">
                Toutes les activités du journal, rendez-vous, devis, missions et contrats rattachés à ce prospect sont intégralement conservés sous son nouveau statut Client.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConvertingContact(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 cursor-pointer shadow-xs"
              >
                Confirmer la conversion en Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Archive Contact */}
      {isArchivingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-amber-600">
              {contact.is_archived === 1 ? (
                <ArchiveRestore className="w-6 h-6 shrink-0" />
              ) : (
                <Archive className="w-6 h-6 shrink-0" />
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {contact.is_archived === 1 ? 'Désarchiver le contact' : 'Archiver la fiche contact'}
                </h3>
                <p className="text-slate-500 text-[11px]">{contact.contact_name}</p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              {contact.is_archived === 1
                ? 'Le contact réapparaîtra dans la liste principale des contacts actifs.'
                : 'La fiche ne sera plus affichée dans la liste principale, mais l\'ensemble de l\'historique, des missions et des factures restera consultable.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsArchivingContact(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                className="px-4 py-1.5 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 cursor-pointer"
              >
                {contact.is_archived === 1 ? 'Confirmer le désarchivage' : 'Confirmer l\'archivage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Activity */}
      {activityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer l'action du journal</h3>
                <p className="text-slate-500 text-[11px] truncate max-w-xs">{activityToDelete.title}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer cette entrée ? Le temps passé associé sera déduit des statistiques.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteActivity}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Mission */}
      {missionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer la mission</h3>
                <p className="text-slate-500 text-[11px] truncate max-w-xs">{missionToDelete.title}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer cette mission ? Les devis, factures et tâches associés seront également dissociés.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMissionToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMission}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
              >
                Supprimer la mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Contract */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer le contrat récurrent</h3>
                <p className="text-slate-500 text-[11px] truncate max-w-xs">{contractToDelete.title}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer ce contrat ? Pour une résiliation normale, il est recommandé de passer le statut à "résilié".
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setContractToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteContract}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
              >
                Supprimer le contrat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Quote */}
      {editingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Modifier le devis {editingQuote.quote_number}</h3>
              <button onClick={() => setEditingQuote(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveQuoteEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Réf. Devis</label>
                  <input
                    type="text"
                    required
                    value={quoteEditForm.quote_number || ''}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, quote_number: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={quoteEditForm.status || 'envoyé'}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="envoyé">Envoyé</option>
                    <option value="accepté">Accepté</option>
                    <option value="refusé">Refusé</option>
                    <option value="expiré">Expiré</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'émission</label>
                  <input
                    type="date"
                    value={quoteEditForm.issue_date || ''}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Validité jusqu'au</label>
                  <input
                    type="date"
                    value={quoteEditForm.valid_until || ''}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, valid_until: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant HT (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteEditForm.amount_ht || 0}
                    onChange={(e) => {
                      const ht = Number(e.target.value);
                      const vat = Number(quoteEditForm.vat_rate || 20);
                      const ttc = ht * (1 + vat / 100);
                      setQuoteEditForm({ ...quoteEditForm, amount_ht: ht, amount_ttc: Math.round(ttc * 100) / 100 });
                    }}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">TVA (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={quoteEditForm.vat_rate || 20}
                    onChange={(e) => {
                      const vat = Number(e.target.value);
                      const ht = Number(quoteEditForm.amount_ht || 0);
                      const ttc = ht * (1 + vat / 100);
                      setQuoteEditForm({ ...quoteEditForm, vat_rate: vat, amount_ttc: Math.round(ttc * 100) / 100 });
                    }}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant TTC (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteEditForm.amount_ttc || 0}
                    onChange={(e) => setQuoteEditForm({ ...quoteEditForm, amount_ttc: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Conditions</label>
                <textarea
                  rows={2}
                  value={quoteEditForm.notes || ''}
                  onChange={(e) => setQuoteEditForm({ ...quoteEditForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingQuote(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Mettre à jour le devis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Quote */}
      {quoteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer le devis</h3>
                <p className="text-slate-500 text-[11px] font-mono">{quoteToDelete.quote_number}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Confirmez-vous la suppression du devis {quoteToDelete.quote_number} d'un montant de {formatEuro(quoteToDelete.amount_ttc)} ?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuoteToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuote}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
              >
                Supprimer le devis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Invoice */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Modifier la facture {editingInvoice.invoice_number}</h3>
              <button onClick={() => setEditingInvoice(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveInvoiceEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Réf. Facture</label>
                  <input
                    type="text"
                    required
                    value={invoiceEditForm.invoice_number || ''}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, invoice_number: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut paiement</label>
                  <select
                    value={invoiceEditForm.payment_status || 'à payer'}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, payment_status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="à payer">À payer (émise)</option>
                    <option value="partiellement payé">Partiellement payée</option>
                    <option value="payé">Payée</option>
                    <option value="en retard">En retard</option>
                    <option value="non facturé">Annulée / Non facturée</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'émission</label>
                  <input
                    type="date"
                    value={invoiceEditForm.issue_date || ''}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    value={invoiceEditForm.due_date || ''}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant HT (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceEditForm.amount_ht || 0}
                    onChange={(e) => {
                      const ht = Number(e.target.value);
                      const vat = Number(invoiceEditForm.vat_rate || 20);
                      const ttc = ht * (1 + vat / 100);
                      setInvoiceEditForm({ ...invoiceEditForm, amount_ht: ht, amount_ttc: Math.round(ttc * 100) / 100 });
                    }}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">TVA (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={invoiceEditForm.vat_rate || 20}
                    onChange={(e) => {
                      const vat = Number(e.target.value);
                      const ht = Number(invoiceEditForm.amount_ht || 0);
                      const ttc = ht * (1 + vat / 100);
                      setInvoiceEditForm({ ...invoiceEditForm, vat_rate: vat, amount_ttc: Math.round(ttc * 100) / 100 });
                    }}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant TTC (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceEditForm.amount_ttc || 0}
                    onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, amount_ttc: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={invoiceEditForm.notes || ''}
                  onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Mettre à jour la facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Invoice */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer la facture</h3>
                <p className="text-slate-500 text-[11px] font-mono">{invoiceToDelete.invoice_number}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Confirmez-vous la suppression de la facture {invoiceToDelete.invoice_number} ? Ses règlements associés seront également supprimés.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInvoice}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
              >
                Supprimer la facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Payment */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer le règlement</h3>
                <p className="text-slate-500 text-[11px]">Facture {paymentToDelete.invoice_number}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Confirmez-vous la suppression du règlement de {formatEuro(paymentToDelete.amount)} reçu le {formatDateFr(paymentToDelete.payment_date)} ?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePayment}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
              >
                Supprimer le règlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Task */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer la tâche</h3>
                <p className="text-slate-500 text-[11px] truncate max-w-xs">{taskToDelete.title}</p>
              </div>
            </div>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer cette tâche ?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTask}
                className="px-4 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
              >
                Supprimer la tâche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Activity */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Modifier l'activité</h3>
              <button onClick={() => setEditingActivity(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveActivityEdit} className="space-y-3">
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
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingActivity.description || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Mission */}
      {editingMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Modifier la mission</h3>
              <button onClick={() => setEditingMission(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveMissionEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de la mission</label>
                <input
                  type="text"
                  required
                  value={editingMission.title}
                  onChange={(e) => setEditingMission({ ...editingMission, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={editingMission.service_category}
                    onChange={(e) => setEditingMission({ ...editingMission, service_category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editingMission.status}
                    onChange={(e) => setEditingMission({ ...editingMission, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="à cadrer">à cadrer</option>
                    <option value="à chiffrer">à chiffrer</option>
                    <option value="devis envoyé">devis envoyé</option>
                    <option value="en attente">en attente</option>
                    <option value="planifiée">planifiée</option>
                    <option value="en cours">en cours</option>
                    <option value="en pause">en pause</option>
                    <option value="livrée">livrée</option>
                    <option value="clôturée">clôturée</option>
                    <option value="annulée">annulée</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant accepté (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={editingMission.accepted_amount}
                    onChange={(e) => setEditingMission({ ...editingMission, accepted_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Budget temps (heures)</label>
                  <input
                    type="number"
                    value={editingMission.time_budget_hours}
                    onChange={(e) => setEditingMission({ ...editingMission, time_budget_hours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMission(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Contract */}
      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Modifier le contrat</h3>
              <button onClick={() => setEditingContract(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveContractEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intitulé</label>
                <input
                  type="text"
                  required
                  value={editingContract.title}
                  onChange={(e) => setEditingContract({ ...editingContract, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant par période (€)</label>
                  <input
                    type="number"
                    step="10"
                    value={editingContract.amount_per_period}
                    onChange={(e) => setEditingContract({ ...editingContract, amount_per_period: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editingContract.status}
                    onChange={(e) => setEditingContract({ ...editingContract, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="actif">Actif</option>
                    <option value="en attente">En attente</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="résilié">Résilié</option>
                    <option value="expiré">Expiré</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContract(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Task */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Modifier la tâche</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveTaskEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={editingTask.due_date || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priorité</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="à faire">À faire</option>
                  <option value="en cours">En cours</option>
                  <option value="terminée">Terminée</option>
                  <option value="annulée">Annulée</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Mission */}
      {isNewMissionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Nouvelle mission pour {contact.contact_name}</h3>
              <button onClick={() => setIsNewMissionOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de la mission *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Refonte site vitrine WordPress & SEO"
                  value={missionForm.title}
                  onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catégorie de prestation</label>
                <select
                  value={missionForm.service_category}
                  onChange={(e) => setMissionForm({ ...missionForm, service_category: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="Création site web">Création site web</option>
                  <option value="Refonte site web">Refonte site web</option>
                  <option value="Maintenance WordPress">Maintenance WordPress</option>
                  <option value="Développement spécifique">Développement spécifique</option>
                  <option value="Audit de site">Audit de site</option>
                  <option value="Configuration GA4 et Google Tag Manager">Configuration GA4 et Google Tag Manager</option>
                  <option value="SEO">SEO</option>
                  <option value="Formation">Formation</option>
                  <option value="Conseil en intelligence artificielle">Conseil en intelligence artificielle</option>
                  <option value="Autre prestation">Autre prestation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant accepté (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={missionForm.accepted_amount}
                    onChange={(e) => setMissionForm({ ...missionForm, accepted_amount: Number(e.target.value), estimated_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Budget temps (heures)</label>
                  <input
                    type="number"
                    step="1"
                    value={missionForm.time_budget_hours}
                    onChange={(e) => setMissionForm({ ...missionForm, time_budget_hours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date début</label>
                  <input
                    type="date"
                    value={missionForm.start_date}
                    onChange={(e) => setMissionForm({ ...missionForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date livraison prévue</label>
                  <input
                    type="date"
                    value={missionForm.expected_delivery_date}
                    onChange={(e) => setMissionForm({ ...missionForm, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewMissionOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Créer la mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Task */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Nouvelle tâche pour ce client</h3>
              <button onClick={() => setIsNewTaskOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de la tâche *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Livrer maquette, relancer devis..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priorité</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 cursor-pointer"
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
