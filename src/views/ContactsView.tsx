import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  CheckCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Archive,
  ArchiveRestore,
  ChevronRight,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api, formatDateFr, formatEuro } from '../services/api.ts';
import { Contact, ContactStatus, LeadSource } from '../types/crm.ts';

interface ContactsViewProps {
  onSelectContact: (id: number) => void;
  onOpenQuickLogForContact: (id: number) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  onSelectContact,
  onOpenQuickLogForContact
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // New Contact Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    company_name: '',
    contact_name: '',
    role_title: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    postal_code: '',
    city: '',
    industry: '',
    lead_source: 'prospection' as LeadSource,
    status: 'prospect' as ContactStatus,
    next_action: '',
    follow_up_date: '',
    notes: ''
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Contact Modal state
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirmation modal state
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Conversion confirmation modal state
  const [contactToConvert, setContactToConvert] = useState<Contact | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // In-app notification feedback banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadContacts();
  }, [statusFilter, searchQuery, showArchived]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await api.getContacts({
        status: statusFilter,
        search: searchQuery,
        include_archived: showArchived
      });
      setContacts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConvert = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    setContactToConvert(contact);
  };

  const handleConfirmConvert = async () => {
    if (!contactToConvert) return;
    setIsConverting(true);
    try {
      await api.convertProspectToClient(contactToConvert.id);
      setContactToConvert(null);
      setNotification({
        type: 'success',
        message: `Le prospect "${contactToConvert.contact_name}" a été converti en Client officiel avec tout son historique.`
      });
      loadContacts();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la conversion'
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.contact_name.trim()) {
      setModalError('Le nom du contact est obligatoire.');
      return;
    }

    setModalSubmitting(true);
    setModalError(null);
    try {
      const created = await api.createContact(modalForm);
      setIsModalOpen(false);
      setModalForm({
        company_name: '',
        contact_name: '',
        role_title: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        postal_code: '',
        city: '',
        industry: '',
        lead_source: 'prospection',
        status: 'prospect',
        next_action: '',
        follow_up_date: '',
        notes: ''
      });
      setNotification({
        type: 'success',
        message: `Fiche de ${created.contact_name} créée avec succès.`
      });
      loadContacts();
      onSelectContact(created.id);
    } catch (err: any) {
      setModalError(err.message || 'Erreur lors de la création');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenEdit = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    setEditingContact(contact);
    setEditForm({ ...contact });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setEditSubmitting(true);
    try {
      await api.updateContact(editingContact.id, editForm);
      setEditingContact(null);
      setNotification({
        type: 'success',
        message: `Fiche de ${editForm.contact_name || editingContact.contact_name} mise à jour avec succès.`
      });
      loadContacts();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de la modification'
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    const willArchive = contact.is_archived === 0;
    try {
      await api.archiveContact(contact.id, willArchive);
      setNotification({
        type: 'success',
        message: willArchive
          ? `Fiche de ${contact.contact_name} archivée.`
          : `Fiche de ${contact.contact_name} restaurée.`
      });
      loadContacts();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de l'archivage"
      });
    }
  };

  const handleOpenDelete = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    setContactToDelete(contact);
    const hasHistory = (contact.active_missions_count || 0) > 0 || (contact.active_contracts_count || 0) > 0;
    if (hasHistory) {
      setDeleteWarning(`Ce contact possède ${contact.active_missions_count || 0} mission(s) et/ou ${contact.active_contracts_count || 0} contrat(s) actif(s).`);
    } else {
      setDeleteWarning(null);
    }
  };

  const handleConfirmDelete = async (force: boolean = false) => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteContact(contactToDelete.id, force);
      setContactToDelete(null);
      setDeleteWarning(null);
      setNotification({
        type: 'success',
        message: res.message || 'Contact supprimé avec succès.'
      });
      loadContacts();
    } catch (err: any) {
      // If error mentions can_force or associated items
      if (err.message && err.message.includes('éléments associés')) {
        setDeleteWarning(err.message);
      } else {
        setNotification({
          type: 'error',
          message: err.message || 'Erreur lors de la suppression'
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Contacts & Entreprises
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestion du carnet d'adresses, modification complète, conversion prospect vers client, archivage et suppression
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau contact</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        {/* Status segmented buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {[
            { id: 'tous', label: 'Tous' },
            { id: 'prospect', label: 'Prospects' },
            { id: 'client', label: 'Clients' },
            { id: 'client_inactif', label: 'Inactifs' },
            { id: 'partenaire', label: 'Partenaires' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input & archive toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Nom, entreprise, ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Afficher archivés</span>
          </label>
        </div>
      </div>

      {/* Contacts List / Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg border border-slate-200" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Aucun contact trouvé</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Modifiez vos critères de recherche ou créez votre première fiche contact.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Créer un contact
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Contact / Entreprise</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Coordonnées</th>
                  <th className="py-3 px-4">Missions / Contrats</th>
                  <th className="py-3 px-4">Prochaine action</th>
                  <th className="py-3 px-4 text-right">Actions de gestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectContact(c.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Name & Company */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {c.contact_name}
                      </div>
                      {c.company_name && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{c.company_name}</span>
                          {c.role_title && <span className="text-slate-400">· {c.role_title}</span>}
                        </div>
                      )}
                    </td>

                    {/* Status with clean unboxed text */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.status === 'prospect' && (
                        <span className="text-amber-700 font-medium">Prospect</span>
                      )}
                      {c.status === 'client' && (
                        <span className="text-emerald-700 font-medium">Client</span>
                      )}
                      {c.status === 'client_inactif' && (
                        <span className="text-slate-500 font-medium">Inactif</span>
                      )}
                      {c.status === 'partenaire' && (
                        <span className="text-indigo-700 font-medium">Partenaire</span>
                      )}
                      {c.is_archived === 1 && (
                        <span className="ml-1 text-[10px] text-slate-400 font-normal">[Archivé]</span>
                      )}
                    </td>

                    {/* Contact Details */}
                    <td className="py-3 px-4">
                      {c.email && (
                        <div className="text-slate-600 truncate max-w-[180px]">
                          {c.email}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {c.phone && <span>{c.phone}</span>}
                        {c.city && <span>· {c.city}</span>}
                      </div>
                    </td>

                    {/* Missions / Contrats metrics */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-slate-700">
                      <div>
                        {c.active_missions_count || 0} mission(s)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.active_contracts_count || 0} contrat(s) actif(s)
                      </div>
                    </td>

                    {/* Next Action */}
                    <td className="py-3 px-4 max-w-xs">
                      {c.next_action ? (
                        <div>
                          <div className="text-slate-900 font-medium truncate">
                            {c.next_action}
                          </div>
                          {c.follow_up_date && (
                            <div className="text-[10px] font-mono tabular-nums text-indigo-600 mt-0.5">
                              Échéance : {formatDateFr(c.follow_up_date)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Comprehensive Actions: Modifier, Supprimer, Archiver, Convertir, Fiche */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {c.status === 'prospect' && (
                          <button
                            onClick={(e) => handleOpenConvert(e, c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors"
                            title="Convertir en Client sans perte d'historique"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Convertir</span>
                          </button>
                        )}

                        <button
                          onClick={() => onOpenQuickLogForContact(c.id)}
                          className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                          title="Consigner une action pour ce contact"
                        >
                          + Action
                        </button>

                        {/* Modifier */}
                        <button
                          onClick={(e) => handleOpenEdit(e, c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs"
                          title="Modifier toutes les informations de ce contact"
                        >
                          <Pencil className="w-3 h-3 text-slate-600" />
                          <span>Modifier</span>
                        </button>

                        {/* Supprimer */}
                        <button
                          onClick={(e) => handleOpenDelete(e, c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-md transition-colors shadow-2xs"
                          title="Supprimer ce contact"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>Supprimer</span>
                        </button>

                        {/* Archiver / Désarchiver */}
                        <button
                          onClick={(e) => handleToggleArchive(e, c)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title={c.is_archived ? "Désarchiver le contact" : "Archiver le contact"}
                        >
                          {c.is_archived ? <ArchiveRestore className="w-3.5 h-3.5 text-amber-600" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => onSelectContact(c.id)}
                          className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          title="Ouvrir la fiche complète"
                        >
                          <span>Fiche</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Nouveau contact / entreprise
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateContact} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nom & Prénom du contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sophie Delorme"
                    value={modalForm.contact_name}
                    onChange={(e) => setModalForm({ ...modalForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Horizon Conseil"
                    value={modalForm.company_name}
                    onChange={(e) => setModalForm({ ...modalForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fonction</label>
                  <input
                    type="text"
                    placeholder="Ex: Directrice associée"
                    value={modalForm.role_title}
                    onChange={(e) => setModalForm({ ...modalForm, role_title: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut initial</label>
                  <select
                    value={modalForm.status}
                    onChange={(e) => setModalForm({ ...modalForm, status: e.target.value as ContactStatus })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="client">Client</option>
                    <option value="partenaire">Partenaire</option>
                    <option value="client_inactif">Client inactif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origine du contact</label>
                  <select
                    value={modalForm.lead_source}
                    onChange={(e) => setModalForm({ ...modalForm, lead_source: e.target.value as LeadSource })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="prospection">Prospection</option>
                    <option value="recommandation">Recommandation</option>
                    <option value="site web">Site web</option>
                    <option value="réseau">Réseau</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={modalForm.email}
                    onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    value={modalForm.phone}
                    onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Web</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={modalForm.website}
                    onChange={(e) => setModalForm({ ...modalForm, website: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    placeholder="12 Rue de la Paix"
                    value={modalForm.address}
                    onChange={(e) => setModalForm({ ...modalForm, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code postal / Ville</label>
                  <input
                    type="text"
                    placeholder="75001 Paris"
                    value={modalForm.city}
                    onChange={(e) => setModalForm({ ...modalForm, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prochaine action</label>
                  <input
                    type="text"
                    placeholder="Ex: Envoyer devis refonte WordPress"
                    value={modalForm.next_action}
                    onChange={(e) => setModalForm({ ...modalForm, next_action: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date de relance prévue</label>
                  <input
                    type="date"
                    value={modalForm.follow_up_date}
                    onChange={(e) => setModalForm({ ...modalForm, follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes générales</label>
                <textarea
                  rows={2}
                  placeholder="Contexte, besoins exprimés, historique..."
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  {modalSubmitting ? 'Création...' : 'Créer la fiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                Modifier la fiche : {editingContact.contact_name}
              </h2>
              <button
                onClick={() => setEditingContact(null)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nom & Prénom du contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.contact_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    value={editForm.company_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fonction</label>
                  <input
                    type="text"
                    value={editForm.role_title || ''}
                    onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editForm.status || 'prospect'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ContactStatus })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="client">Client</option>
                    <option value="partenaire">Partenaire</option>
                    <option value="client_inactif">Client inactif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origine</label>
                  <select
                    value={editForm.lead_source || 'prospection'}
                    onChange={(e) => setEditForm({ ...editForm, lead_source: e.target.value as LeadSource })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="prospection">Prospection</option>
                    <option value="recommandation">Recommandation</option>
                    <option value="site web">Site web</option>
                    <option value="réseau">Réseau</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Web</label>
                  <input
                    type="url"
                    value={editForm.website || ''}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code postal / Ville</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prochaine action</label>
                  <input
                    type="text"
                    value={editForm.next_action || ''}
                    onChange={(e) => setEditForm({ ...editForm, next_action: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date relance</label>
                  <input
                    type="date"
                    value={editForm.follow_up_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes générales</label>
                <textarea
                  rows={3}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  {editSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Supprimer le contact
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {contactToDelete.contact_name} {contactToDelete.company_name ? `(${contactToDelete.company_name})` : ''}
                </p>
              </div>
            </div>

            {deleteWarning ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-2">
                <p className="font-medium">{deleteWarning}</p>
                <p className="text-[11px] text-amber-700">
                  Une suppression forcée supprimera définitivement le contact et l'ensemble de ses missions, contrats, devis et factures rattachées.
                </p>
              </div>
            ) : (
              <p className="text-slate-600">
                Êtes-vous sûr de vouloir supprimer définitivement ce contact ? Cette opération est irréversible.
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setContactToDelete(null);
                  setDeleteWarning(null);
                }}
                className="w-full sm:w-auto px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>

              {deleteWarning && (
                <button
                  type="button"
                  onClick={() => {
                    handleToggleArchive({} as any, contactToDelete);
                    setContactToDelete(null);
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium hover:bg-amber-100"
                >
                  Archiver plutôt
                </button>
              )}

              <button
                type="button"
                onClick={() => handleConfirmDelete(Boolean(deleteWarning))}
                disabled={isDeleting}
                className="w-full sm:w-auto px-3 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-xs"
              >
                {isDeleting ? 'Suppression...' : (deleteWarning ? 'Confirmer suppression forcée' : 'Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Prospect Confirmation Modal */}
      {contactToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-emerald-600">
              <Sparkles className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Convertir en Client officiel
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {contactToConvert.contact_name} {contactToConvert.company_name ? `(${contactToConvert.company_name})` : ''}
                </p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 space-y-1">
              <p className="font-semibold text-xs">Conservation intégrale des données :</p>
              <p className="text-[11px] text-emerald-700">
                La conversion ne crée aucun doublon. L'ensemble de l'historique de prospection, des devis, des contrats, des missions et des échanges sera intégralement conservé sous le statut Client.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setContactToConvert(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConfirmConvert}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 shadow-xs"
              >
                {isConverting ? 'Conversion en cours...' : 'Confirmer la conversion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
