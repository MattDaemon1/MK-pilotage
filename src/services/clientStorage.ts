// Client-side local storage engine for offline / static Vercel deployments
// Ensures Matt Konnect CRM functions completely in the browser without server errors.

import {
  Contact,
  ContactDetailResponse,
  Activity,
  Mission,
  Contract,
  Quote,
  Invoice,
  Payment,
  Task,
  DashboardData,
  ActivityCategory,
  ActivityStatus,
  ContractFrequency,
  ContractStatus,
  QuoteStatus,
  InvoicePaymentStatus,
  TaskPriority,
  TaskStatus,
  ContactStatus,
  LeadSource
} from '../types/crm.ts';

const STORAGE_KEY = 'matt_konnect_crm_v1';

interface CRMDataStore {
  contacts: Contact[];
  missions: Mission[];
  contracts: Contract[];
  activities: Activity[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  tasks: Task[];
  settings: Record<string, string>;
}

function getInitialStore(): CRMDataStore {
  return {
    contacts: [],
    missions: [],
    contracts: [],
    activities: [],
    quotes: [],
    invoices: [],
    payments: [],
    tasks: [],
    settings: {
      company_name: 'Matt Konnect',
      owner_name: 'Matt',
      owner_email: 'matt@example.com',
      default_vat_rate: '20',
      currency: 'EUR'
    }
  };
}

function loadStore(): CRMDataStore {
  if (typeof window === 'undefined') return getInitialStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialStore();
      saveStore(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
      missions: Array.isArray(parsed.missions) ? parsed.missions : [],
      contracts: Array.isArray(parsed.contracts) ? parsed.contracts : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      settings: parsed.settings || getInitialStore().settings
    };
  } catch (e) {
    console.warn('Failed to parse CRM data from localStorage:', e);
    return getInitialStore();
  }
}

function saveStore(store: CRMDataStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save CRM store to localStorage:', e);
  }
}

function nextId(items: { id: number }[]): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id || 0)) + 1;
}

export const clientStorage = {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  },

  // -------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------
  async getDashboard(): Promise<DashboardData> {
    const store = loadStore();
    const todayStr = new Date().toISOString().split('T')[0];

    const activeProspects = store.contacts.filter(
      (c) => c.status === 'prospect' && !c.is_archived
    ).length;

    const activeClients = store.contacts.filter(
      (c) => c.status === 'client' && !c.is_archived
    ).length;

    const activeMissions = store.missions.filter(
      (m) => !['clôturée', 'annulée'].includes(m.status) && !m.is_archived
    ).length;

    const overdueTasks = store.tasks.filter(
      (t) => t.status !== 'terminée' && t.due_date && t.due_date < todayStr
    ).length;

    const todayTasks = store.tasks.filter(
      (t) => t.status !== 'terminée' && t.due_date === todayStr
    ).length;

    const pendingQuotes = store.quotes.filter((q) => q.status === 'envoyé').length;

    const renewingContracts = store.contracts
      .filter((ctr) => ctr.status === 'actif')
      .map((ctr) => {
        const contact = store.contacts.find((c) => c.id === ctr.contact_id);
        return {
          ...ctr,
          company_name: contact?.company_name || null,
          contact_name: contact?.contact_name || ''
        };
      });

    const followUpsNeeded = store.contacts
      .filter((c) => !c.is_archived && c.follow_up_date && c.next_action)
      .sort((a, b) => (a.follow_up_date || '').localeCompare(b.follow_up_date || ''))
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        contact_name: c.contact_name,
        company_name: c.company_name,
        next_action: c.next_action || '',
        follow_up_date: c.follow_up_date || ''
      }));

    // Normalized MRR
    let mrr = 0;
    for (const c of store.contracts.filter((ctr) => ctr.status === 'actif')) {
      const amt = c.amount_per_period || 0;
      if (c.frequency === 'mensuelle') mrr += amt;
      else if (c.frequency === 'trimestrielle') mrr += amt / 3;
      else if (c.frequency === 'semestrielle') mrr += amt / 6;
      else if (c.frequency === 'annuelle') mrr += amt / 12;
    }

    const signedRevenue = store.quotes
      .filter((q) => q.status === 'accepté')
      .reduce((sum, q) => sum + (q.amount_ttc || 0), 0);

    const invoicedRevenue = store.invoices.reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);
    const collectedRevenue = store.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingRevenue = Math.max(0, invoicedRevenue - collectedRevenue);

    let overdueAmount = 0;
    for (const inv of store.invoices) {
      if (inv.due_date && inv.due_date < todayStr) {
        const paid = store.payments
          .filter((p) => p.invoice_id === inv.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        const rem = inv.amount_ttc - paid;
        if (rem > 0.01) overdueAmount += rem;
      }
    }

    // Time spent by category
    const catMap: Record<string, number> = {};
    for (const a of store.activities) {
      const cat = a.category || 'Autre';
      catMap[cat] = (catMap[cat] || 0) + (a.duration_minutes || 0);
    }
    const timeSpentByCategory = Object.entries(catMap)
      .map(([category, total_minutes]) => ({ category, total_minutes }))
      .sort((a, b) => b.total_minutes - a.total_minutes);

    // Time spent by client
    const clientMap: Record<string, number> = {};
    for (const a of store.activities) {
      const contact = store.contacts.find((c) => c.id === a.contact_id);
      const name = contact?.company_name || contact?.contact_name || 'Tâches internes';
      clientMap[name] = (clientMap[name] || 0) + (a.duration_minutes || 0);
    }
    const timeSpentByClient = Object.entries(clientMap)
      .map(([client_name, total_minutes]) => ({ client_name, total_minutes }))
      .sort((a, b) => b.total_minutes - a.total_minutes);

    const recentActivities = [...store.activities]
      .sort((a, b) => (b.activity_date || '').localeCompare(a.activity_date || ''))
      .slice(0, 10)
      .map((a) => {
        const contact = store.contacts.find((c) => c.id === a.contact_id);
        const mission = store.missions.find((m) => m.id === a.mission_id);
        return {
          ...a,
          contact_name: contact?.contact_name,
          company_name: contact?.company_name,
          mission_title: mission?.title
        };
      });

    return {
      active_prospects: activeProspects,
      active_clients: activeClients,
      active_missions: activeMissions,
      overdue_tasks: overdueTasks,
      today_tasks: todayTasks,
      pending_quotes: pendingQuotes,
      renewing_contracts_count: renewingContracts.length,
      renewing_contracts: renewingContracts,
      follow_ups_needed: followUpsNeeded,
      mrr,
      signed_revenue: signedRevenue,
      invoiced_revenue: invoicedRevenue,
      collected_revenue: collectedRevenue,
      remaining_revenue: remainingRevenue,
      overdue_amount: overdueAmount,
      time_spent_by_category: timeSpentByCategory,
      time_spent_by_client: timeSpentByClient,
      recent_activities: recentActivities
    };
  },

  // -------------------------------------------------------------
  // Contacts
  // -------------------------------------------------------------
  async getContacts(params?: { status?: string; search?: string; include_archived?: boolean }): Promise<Contact[]> {
    const store = loadStore();
    return store.contacts
      .filter((c) => {
        if (!params?.include_archived && c.is_archived) return false;
        if (params?.status && params.status !== 'tous' && c.status !== params.status) return false;
        if (params?.search && params.search.trim()) {
          const q = params.search.toLowerCase().trim();
          const match =
            (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
            (c.company_name && c.company_name.toLowerCase().includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.city && c.city.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .map((c) => {
        const activeMissionsCount = store.missions.filter(
          (m) => m.contact_id === c.id && !['clôturée', 'annulée'].includes(m.status)
        ).length;
        const activeContractsCount = store.contracts.filter(
          (ctr) => ctr.contact_id === c.id && ctr.status === 'actif'
        ).length;
        const contactActivities = store.activities.filter((a) => a.contact_id === c.id);
        const lastInteraction = contactActivities.sort((a, b) =>
          (b.activity_date || '').localeCompare(a.activity_date || '')
        )[0];
        const totalCollected = store.payments
          .filter((p) => p.contact_id === c.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
          ...c,
          active_missions_count: activeMissionsCount,
          active_contracts_count: activeContractsCount,
          last_interaction_date: lastInteraction?.activity_date,
          total_collected: totalCollected
        };
      })
      .sort((a, b) => (a.contact_name || '').localeCompare(b.contact_name || ''));
  },

  async getContact(id: number): Promise<ContactDetailResponse> {
    const store = loadStore();
    const contact = store.contacts.find((c) => c.id === id);
    if (!contact) {
      throw new Error(`Contact ID ${id} introuvable.`);
    }

    const contactMissions = store.missions.filter((m) => m.contact_id === id);
    const contactContracts = store.contracts.filter((ctr) => ctr.contact_id === id);
    const contactActivities = store.activities.filter((a) => a.contact_id === id);
    const contactQuotes = store.quotes.filter((q) => q.contact_id === id);
    const contactInvoices = store.invoices.filter((inv) => inv.contact_id === id);
    const contactPayments = store.payments.filter((p) => p.contact_id === id);
    const contactTasks = store.tasks.filter((t) => t.contact_id === id);

    const totalAccepted = contactMissions.reduce((sum, m) => sum + (m.accepted_amount || 0), 0);
    const totalInvoiced = contactInvoices.reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);
    const totalCollected = contactPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalMinutes = contactActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

    const lastInteraction = [...contactActivities].sort((a, b) =>
      (b.activity_date || '').localeCompare(a.activity_date || '')
    )[0] || null;

    const missionsWithStats = contactMissions.map((m) => {
      const minutesSpent = contactActivities
        .filter((a) => a.mission_id === m.id)
        .reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
      const missionInvoiced = contactInvoices
        .filter((inv) => inv.mission_id === m.id)
        .reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);
      return {
        ...m,
        contact_name: contact.contact_name,
        company_name: contact.company_name,
        actual_minutes_spent: minutesSpent,
        invoiced_amount: missionInvoiced
      };
    });

    const activitiesWithMeta = contactActivities.map((a) => {
      const mission = store.missions.find((m) => m.id === a.mission_id);
      return {
        ...a,
        contact_name: contact.contact_name,
        company_name: contact.company_name,
        mission_title: mission?.title
      };
    });

    const activeMissions = contactMissions.filter(
      (m) => !['clôturée', 'annulée'].includes(m.status)
    );
    const runningAmount = activeMissions.reduce((sum, m) => sum + (m.accepted_amount || 0), 0);

    return {
      contact: {
        ...contact,
        active_missions_count: activeMissions.length,
        active_contracts_count: contactContracts.filter((c) => c.status === 'actif').length
      },
      metrics: {
        total_accepted: totalAccepted,
        total_invoiced: totalInvoiced,
        total_collected: totalCollected,
        balance_due: Math.max(0, totalInvoiced - totalCollected),
        active_missions_count: activeMissions.length,
        running_missions_amount: runningAmount,
        active_contracts_count: contactContracts.filter((c) => c.status === 'actif').length,
        total_hours_spent: Math.round((totalMinutes / 60) * 10) / 10,
        last_interaction: lastInteraction,
        next_action: contact.next_action,
        follow_up_date: contact.follow_up_date
      },
      activities: activitiesWithMeta,
      missions: missionsWithStats,
      contracts: contactContracts,
      quotes: contactQuotes,
      invoices: contactInvoices,
      payments: contactPayments,
      tasks: contactTasks
    };
  },

  async createContact(data: Partial<Contact>): Promise<Contact> {
    const store = loadStore();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newContact: Contact = {
      id: nextId(store.contacts),
      company_name: data.company_name || null,
      contact_name: data.contact_name || 'Sans nom',
      role_title: data.role_title || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      address: data.address || null,
      postal_code: data.postal_code || null,
      city: data.city || null,
      industry: data.industry || null,
      lead_source: (data.lead_source as LeadSource) || 'prospection',
      status: (data.status as ContactStatus) || 'prospect',
      next_action: data.next_action || null,
      follow_up_date: data.follow_up_date || null,
      notes: data.notes || null,
      is_archived: 0,
      created_at: now,
      updated_at: now
    };
    store.contacts.push(newContact);
    saveStore(store);
    return newContact;
  },

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    const store = loadStore();
    const idx = store.contacts.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Contact ID ${id} introuvable.`);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updated = {
      ...store.contacts[idx],
      ...data,
      updated_at: now
    };
    store.contacts[idx] = updated;
    saveStore(store);
    return updated;
  },

  async convertProspectToClient(id: number): Promise<{ success: boolean; contact: Contact; message: string }> {
    const store = loadStore();
    const contact = store.contacts.find((c) => c.id === id);
    if (!contact) throw new Error(`Contact ID ${id} introuvable.`);
    contact.status = 'client';
    contact.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Auto log activity
    store.activities.push({
      id: nextId(store.activities),
      title: 'Conversion Prospect -> Client',
      description: 'Converti avec succès sans perte d’historique.',
      activity_date: new Date().toISOString().split('T')[0],
      activity_time: null,
      contact_id: id,
      mission_id: null,
      category: 'Autre',
      duration_minutes: 0,
      status: 'réalisé',
      result: null,
      next_action: null,
      attachment_url: null,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    saveStore(store);
    return {
      success: true,
      contact,
      message: `Le prospect "${contact.contact_name}" a été converti en Client avec succès.`
    };
  },

  async archiveContact(id: number, is_archived: boolean): Promise<{ success: boolean }> {
    const store = loadStore();
    const contact = store.contacts.find((c) => c.id === id);
    if (!contact) throw new Error(`Contact ID ${id} introuvable.`);
    contact.is_archived = is_archived ? 1 : 0;
    saveStore(store);
    return { success: true };
  },

  async deleteContact(id: number, force: boolean = false): Promise<{ success: boolean; message: string; can_force?: boolean }> {
    const store = loadStore();
    const contact = store.contacts.find((c) => c.id === id);
    if (!contact) throw new Error(`Contact ID ${id} introuvable.`);

    const missionsCount = store.missions.filter((m) => m.contact_id === id).length;
    const contractsCount = store.contracts.filter((ctr) => ctr.contact_id === id).length;
    const invoicesCount = store.invoices.filter((inv) => inv.contact_id === id).length;

    if (!force && (missionsCount > 0 || contractsCount > 0 || invoicesCount > 0)) {
      return {
        success: false,
        can_force: true,
        message: `Impossible de supprimer ce contact : il contient ${missionsCount} mission(s), ${contractsCount} contrat(s) et ${invoicesCount} facture(s). Vous pouvez archiver la fiche ou forcer la suppression en cascade.`
      };
    }

    if (force) {
      store.missions = store.missions.filter((m) => m.contact_id !== id);
      store.contracts = store.contracts.filter((ctr) => ctr.contact_id !== id);
      store.invoices = store.invoices.filter((inv) => inv.contact_id !== id);
      store.quotes = store.quotes.filter((q) => q.contact_id !== id);
      store.payments = store.payments.filter((p) => p.contact_id !== id);
      store.activities = store.activities.filter((a) => a.contact_id !== id);
      store.tasks = store.tasks.filter((t) => t.contact_id !== id);
    }

    store.contacts = store.contacts.filter((c) => c.id !== id);
    saveStore(store);
    return { success: true, message: `Contact "${contact.contact_name}" supprimé avec succès.` };
  },

  // -------------------------------------------------------------
  // Activities
  // -------------------------------------------------------------
  async getActivities(params?: any): Promise<Activity[]> {
    const store = loadStore();
    return store.activities
      .filter((a) => {
        if (params?.contact_id && a.contact_id !== Number(params.contact_id)) return false;
        if (params?.mission_id && a.mission_id !== Number(params.mission_id)) return false;
        if (params?.category && a.category !== params.category) return false;
        if (params?.status && a.status !== params.status) return false;
        if (params?.search && params.search.trim()) {
          const q = params.search.toLowerCase().trim();
          const match = (a.title && a.title.toLowerCase().includes(q)) || (a.description && a.description.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .map((a) => {
        const c = store.contacts.find((item) => item.id === a.contact_id);
        const m = store.missions.find((item) => item.id === a.mission_id);
        return {
          ...a,
          contact_name: c?.contact_name,
          company_name: c?.company_name,
          mission_title: m?.title
        };
      })
      .sort((a, b) => (b.activity_date || '').localeCompare(a.activity_date || ''));
  },

  async createActivity(data: Partial<Activity>): Promise<Activity> {
    const store = loadStore();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newActivity: Activity = {
      id: nextId(store.activities),
      title: data.title || 'Activité sans titre',
      description: data.description || null,
      activity_date: data.activity_date || new Date().toISOString().split('T')[0],
      activity_time: data.activity_time || null,
      contact_id: data.contact_id ? Number(data.contact_id) : null,
      mission_id: data.mission_id ? Number(data.mission_id) : null,
      category: (data.category as ActivityCategory) || 'Autre',
      duration_minutes: Number(data.duration_minutes) || 0,
      status: (data.status as ActivityStatus) || 'réalisé',
      result: data.result || null,
      next_action: data.next_action || null,
      attachment_url: data.attachment_url || null,
      created_at: now,
      updated_at: now
    };
    store.activities.push(newActivity);
    saveStore(store);
    return newActivity;
  },

  async updateActivity(id: number, data: Partial<Activity>): Promise<Activity> {
    const store = loadStore();
    const idx = store.activities.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Activité ID ${id} introuvable.`);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updated = {
      ...store.activities[idx],
      ...data,
      updated_at: now
    };
    store.activities[idx] = updated;
    saveStore(store);
    return updated;
  },

  async deleteActivity(id: number): Promise<{ success: boolean }> {
    const store = loadStore();
    store.activities = store.activities.filter((a) => a.id !== id);
    saveStore(store);
    return { success: true };
  },

  // -------------------------------------------------------------
  // Missions
  // -------------------------------------------------------------
  async getMissions(params?: any): Promise<Mission[]> {
    const store = loadStore();
    return store.missions
      .filter((m) => {
        if (params?.contact_id && m.contact_id !== Number(params.contact_id)) return false;
        if (params?.status && m.status !== params.status) return false;
        return true;
      })
      .map((m) => {
        const contact = store.contacts.find((c) => c.id === m.contact_id);
        const minutesSpent = store.activities
          .filter((a) => a.mission_id === m.id)
          .reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
        const invoicedAmount = store.invoices
          .filter((inv) => inv.mission_id === m.id)
          .reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);
        return {
          ...m,
          contact_name: contact?.contact_name,
          company_name: contact?.company_name,
          actual_minutes_spent: minutesSpent,
          invoiced_amount: invoicedAmount
        };
      })
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
  },

  async createMission(data: Partial<Mission>): Promise<Mission> {
    const store = loadStore();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const count = store.missions.length + 1;
    const ref = data.reference || `MIS-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    const newMission: Mission = {
      id: nextId(store.missions),
      reference: ref,
      title: data.title || 'Nouvelle mission',
      contact_id: Number(data.contact_id),
      service_category: data.service_category || 'Développement',
      is_recurring: data.is_recurring ? 1 : 0,
      description: data.description || null,
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: data.expected_delivery_date || null,
      closed_date: null,
      status: data.status || 'à cadrer',
      estimated_amount: Number(data.estimated_amount) || 0,
      accepted_amount: Number(data.accepted_amount) || 0,
      time_budget_hours: Number(data.time_budget_hours) || 0,
      notes: data.notes || null,
      is_archived: 0,
      created_at: now,
      updated_at: now
    };
    store.missions.push(newMission);
    saveStore(store);
    return newMission;
  },

  async updateMission(id: number, data: Partial<Mission>): Promise<Mission> {
    const store = loadStore();
    const idx = store.missions.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error(`Mission ID ${id} introuvable.`);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updated = {
      ...store.missions[idx],
      ...data,
      updated_at: now
    };
    store.missions[idx] = updated;
    saveStore(store);
    return updated;
  },

  async deleteMission(id: number): Promise<{ success: boolean }> {
    const store = loadStore();
    store.missions = store.missions.filter((m) => m.id !== id);
    saveStore(store);
    return { success: true };
  },

  // -------------------------------------------------------------
  // Contracts
  // -------------------------------------------------------------
  async getContracts(): Promise<{ contracts: Contract[]; total_mrr: number }> {
    const store = loadStore();
    const contractsWithMeta = store.contracts.map((ctr) => {
      const contact = store.contacts.find((c) => c.id === ctr.contact_id);
      return {
        ...ctr,
        contact_name: contact?.contact_name,
        company_name: contact?.company_name
      };
    });
    let total_mrr = 0;
    for (const c of contractsWithMeta.filter((ctr) => ctr.status === 'actif')) {
      const amt = c.amount_per_period || 0;
      if (c.frequency === 'mensuelle') total_mrr += amt;
      else if (c.frequency === 'trimestrielle') total_mrr += amt / 3;
      else if (c.frequency === 'semestrielle') total_mrr += amt / 6;
      else if (c.frequency === 'annuelle') total_mrr += amt / 12;
    }
    return { contracts: contractsWithMeta, total_mrr };
  },

  async createContract(data: Partial<Contract>): Promise<Contract> {
    const store = loadStore();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const count = store.contracts.length + 1;
    const ref = data.reference || `CTR-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    const newContract: Contract = {
      id: nextId(store.contracts),
      reference: ref,
      contact_id: Number(data.contact_id),
      title: data.title || 'Nouveau contrat de maintenance',
      description: data.description || null,
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date || null,
      frequency: (data.frequency as ContractFrequency) || 'mensuelle',
      amount_per_period: Number(data.amount_per_period) || 0,
      next_renewal_date: data.next_renewal_date || null,
      notice_period_days: Number(data.notice_period_days) || 30,
      included_hours_per_month: Number(data.included_hours_per_month) || 0,
      status: (data.status as ContractStatus) || 'actif',
      notes: data.notes || null,
      created_at: now,
      updated_at: now
    };
    store.contracts.push(newContract);
    saveStore(store);
    return newContract;
  },

  async updateContract(id: number, data: Partial<Contract>): Promise<Contract> {
    const store = loadStore();
    const idx = store.contracts.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Contrat ID ${id} introuvable.`);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updated = {
      ...store.contracts[idx],
      ...data,
      updated_at: now
    };
    store.contracts[idx] = updated;
    saveStore(store);
    return updated;
  },

  async deleteContract(id: number): Promise<{ success: boolean }> {
    const store = loadStore();
    store.contracts = store.contracts.filter((c) => c.id !== id);
    saveStore(store);
    return { success: true };
  },

  // -------------------------------------------------------------
  // Finances (Quotes, Invoices, Payments)
  // -------------------------------------------------------------
  async getFinances(): Promise<any> {
    const store = loadStore();
    const todayStr = new Date().toISOString().split('T')[0];

    const quotesWithMeta = store.quotes.map((q) => {
      const contact = store.contacts.find((c) => c.id === q.contact_id);
      return {
        ...q,
        contact_name: contact?.contact_name,
        company_name: contact?.company_name
      };
    });

    const invoicesWithMeta = store.invoices.map((inv) => {
      const contact = store.contacts.find((c) => c.id === inv.contact_id);
      const paid = store.payments
        .filter((p) => p.invoice_id === inv.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      return {
        ...inv,
        contact_name: contact?.contact_name,
        company_name: contact?.company_name,
        paid_amount: paid
      };
    });

    const paymentsWithMeta = store.payments.map((p) => {
      const contact = store.contacts.find((c) => c.id === p.contact_id);
      const invoice = store.invoices.find((inv) => inv.id === p.invoice_id);
      return {
        ...p,
        contact_name: contact?.contact_name,
        company_name: contact?.company_name,
        invoice_number: invoice?.invoice_number
      };
    });

    const signedAmount = store.quotes
      .filter((q) => q.status === 'accepté')
      .reduce((acc, q) => acc + (q.amount_ttc || 0), 0);

    const invoicedAmount = store.invoices.reduce((acc, inv) => acc + (inv.amount_ttc || 0), 0);
    const collectedAmount = store.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const remainingToCollect = Math.max(0, invoicedAmount - collectedAmount);

    let overdueAmount = 0;
    let overdueCount = 0;
    for (const inv of invoicesWithMeta) {
      if (inv.due_date && inv.due_date < todayStr && inv.payment_status !== 'payé') {
        const rem = inv.amount_ttc - (inv.paid_amount || 0);
        if (rem > 0.01) {
          overdueAmount += rem;
          overdueCount++;
        }
      }
    }

    return {
      quotes: quotesWithMeta,
      invoices: invoicesWithMeta,
      payments: paymentsWithMeta,
      summary: {
        signed_amount: signedAmount,
        invoiced_amount: invoicedAmount,
        collected_amount: collectedAmount,
        remaining_to_collect: remainingToCollect,
        overdue_amount: overdueAmount,
        overdue_count: overdueCount
      }
    };
  },

  async createQuote(data: Partial<Quote>): Promise<Quote> {
    const store = loadStore();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const count = store.quotes.length + 1;
    const num = data.quote_number || `DEV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    const ht = Number(data.amount_ht) || 0;
    const taxRate = Number(data.tax_rate ?? data.vat_rate ?? 20);
    const ttc = data.amount_ttc ? Number(data.amount_ttc) : Math.round(ht * (1 + taxRate / 100) * 100) / 100;

    const newQuote: Quote = {
      id: nextId(store.quotes),
      quote_number: num,
      contact_id: Number(data.contact_id),
      mission_id: data.mission_id ? Number(data.mission_id) : null,
      issue_date: data.issue_date || new Date().toISOString().split('T')[0],
      validity_date: data.validity_date || data.valid_until || null,
      amount_ht: ht,
      tax_rate: taxRate,
      amount_ttc: ttc,
      status: (data.status as QuoteStatus) || 'brouillon',
      document_url: data.document_url || null,
      notes: data.notes || null,
      created_at: now
    };
    store.quotes.push(newQuote);
    saveStore(store);
    return newQuote;
  },

  async updateQuote(id: number, data: Partial<Quote>): Promise<Quote> {
    const store = loadStore();
    const idx = store.quotes.findIndex((q) => q.id === id);
    if (idx === -1) throw new Error(`Devis ID ${id} introuvable.`);
    const updated = {
      ...store.quotes[idx],
      ...data
    };
    store.quotes[idx] = updated;
    saveStore(store);
    return updated;
  },

  async deleteQuote(id: number): Promise<{ success: boolean; message: string }> {
    const store = loadStore();
    store.quotes = store.quotes.filter((q) => q.id !== id);
    saveStore(store);
    return { success: true, message: 'Devis supprimé.' };
  },

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const store = loadStore();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const count = store.invoices.length + 1;
    const num = data.invoice_number || `FAC-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    const ht = Number(data.amount_ht) || 0;
    const taxRate = Number(data.tax_rate ?? data.vat_rate ?? 20);
    const ttc = data.amount_ttc ? Number(data.amount_ttc) : Math.round(ht * (1 + taxRate / 100) * 100) / 100;

    const newInvoice: Invoice = {
      id: nextId(store.invoices),
      invoice_number: num,
      contact_id: Number(data.contact_id),
      mission_id: data.mission_id ? Number(data.mission_id) : null,
      quote_id: data.quote_id ? Number(data.quote_id) : null,
      issue_date: data.issue_date || new Date().toISOString().split('T')[0],
      due_date: data.due_date || new Date().toISOString().split('T')[0],
      amount_ht: ht,
      tax_rate: taxRate,
      amount_ttc: ttc,
      paid_amount: 0,
      payment_status: 'à payer',
      document_url: data.document_url || null,
      notes: data.notes || null,
      created_at: now
    };
    store.invoices.push(newInvoice);
    saveStore(store);
    return newInvoice;
  },

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    const store = loadStore();
    const idx = store.invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) throw new Error(`Facture ID ${id} introuvable.`);
    const updated = {
      ...store.invoices[idx],
      ...data
    };
    store.invoices[idx] = updated;
    saveStore(store);
    return updated;
  },

  async deleteInvoice(id: number): Promise<{ success: boolean; message: string }> {
    const store = loadStore();
    store.invoices = store.invoices.filter((inv) => inv.id !== id);
    store.payments = store.payments.filter((p) => p.invoice_id !== id);
    saveStore(store);
    return { success: true, message: 'Facture supprimée.' };
  },

  async recordPayment(data: {
    invoice_id: number;
    amount: number;
    payment_date: string;
    payment_method?: string;
    reference?: string;
    notes?: string;
  }): Promise<Payment> {
    const store = loadStore();
    const invoice = store.invoices.find((inv) => inv.id === Number(data.invoice_id));
    if (!invoice) throw new Error(`Facture ID ${data.invoice_id} introuvable.`);

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newPayment: Payment = {
      id: nextId(store.payments),
      invoice_id: Number(data.invoice_id),
      contact_id: invoice.contact_id,
      amount: Number(data.amount),
      payment_date: data.payment_date || new Date().toISOString().split('T')[0],
      payment_method: data.payment_method || 'virement',
      reference: data.reference || null,
      notes: data.notes || null,
      created_at: now
    };
    store.payments.push(newPayment);

    // Update invoice paid amount & status
    const totalPaid = store.payments
      .filter((p) => p.invoice_id === invoice.id)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    invoice.paid_amount = totalPaid;
    if (totalPaid >= invoice.amount_ttc) {
      invoice.payment_status = 'payé';
    } else if (totalPaid > 0) {
      invoice.payment_status = 'partiellement payé';
    } else {
      invoice.payment_status = 'à payer';
    }

    saveStore(store);
    return newPayment;
  },

  async deletePayment(id: number): Promise<{ success: boolean; message: string }> {
    const store = loadStore();
    const payment = store.payments.find((p) => p.id === id);
    if (!payment) throw new Error(`Paiement ID ${id} introuvable.`);
    const invoiceId = payment.invoice_id;
    store.payments = store.payments.filter((p) => p.id !== id);

    // Recalculate invoice
    const invoice = store.invoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      const totalPaid = store.payments
        .filter((p) => p.invoice_id === invoice.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      invoice.paid_amount = totalPaid;
      if (totalPaid >= invoice.amount_ttc) {
        invoice.payment_status = 'payé';
      } else if (totalPaid > 0) {
        invoice.payment_status = 'partiellement payé';
      } else {
        invoice.payment_status = 'à payer';
      }
    }

    saveStore(store);
    return { success: true, message: 'Paiement supprimé.' };
  },

  // -------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------
  async getTasks(params?: any): Promise<Task[]> {
    const store = loadStore();
    return store.tasks
      .filter((t) => {
        if (params?.contact_id && t.contact_id !== Number(params.contact_id)) return false;
        if (params?.mission_id && t.mission_id !== Number(params.mission_id)) return false;
        return true;
      })
      .map((t) => {
        const contact = store.contacts.find((c) => c.id === t.contact_id);
        const mission = store.missions.find((m) => m.id === t.mission_id);
        const contract = store.contracts.find((ctr) => ctr.id === t.contract_id);
        return {
          ...t,
          contact_name: contact?.contact_name,
          company_name: contact?.company_name,
          mission_title: mission?.title,
          contract_title: contract?.title
        };
      })
      .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    const store = loadStore();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newTask: Task = {
      id: nextId(store.tasks),
      title: data.title || 'Tâche sans titre',
      description: data.description || null,
      due_date: data.due_date || null,
      priority: (data.priority as TaskPriority) || 'normale',
      status: (data.status as TaskStatus) || 'à faire',
      contact_id: data.contact_id ? Number(data.contact_id) : null,
      mission_id: data.mission_id ? Number(data.mission_id) : null,
      contract_id: data.contract_id ? Number(data.contract_id) : null,
      task_type: data.task_type || 'générale',
      estimated_duration_minutes: Number(data.estimated_duration_minutes) || 0,
      actual_duration_minutes: Number(data.actual_duration_minutes) || 0,
      completed_at: null,
      created_at: now
    };
    store.tasks.push(newTask);
    saveStore(store);
    return newTask;
  },

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const store = loadStore();
    const idx = store.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Tâche ID ${id} introuvable.`);
    const isCompleted = data.status === 'terminée';
    const updated = {
      ...store.tasks[idx],
      ...data,
      completed_at: isCompleted ? new Date().toISOString().replace('T', ' ').substring(0, 19) : (data.status ? null : store.tasks[idx].completed_at)
    };
    store.tasks[idx] = updated;
    saveStore(store);
    return updated;
  },

  async deleteTask(id: number): Promise<{ success: boolean }> {
    const store = loadStore();
    store.tasks = store.tasks.filter((t) => t.id !== id);
    saveStore(store);
    return { success: true };
  },

  // -------------------------------------------------------------
  // Search
  // -------------------------------------------------------------
  async globalSearch(q: string): Promise<any> {
    const store = loadStore();
    const term = (q || '').toLowerCase().trim();
    if (!term) {
      return { contacts: [], missions: [], contracts: [], activities: [], tasks: [], invoices: [] };
    }

    const contacts = store.contacts
      .filter((c) => (c.contact_name && c.contact_name.toLowerCase().includes(term)) || (c.company_name && c.company_name.toLowerCase().includes(term)))
      .slice(0, 5);

    const missions = store.missions
      .filter((m) => (m.title && m.title.toLowerCase().includes(term)) || (m.reference && m.reference.toLowerCase().includes(term)))
      .slice(0, 5);

    const contracts = store.contracts
      .filter((ctr) => ctr.title && ctr.title.toLowerCase().includes(term))
      .slice(0, 5);

    const activities = store.activities
      .filter((a) => (a.title && a.title.toLowerCase().includes(term)) || (a.description && a.description.toLowerCase().includes(term)))
      .slice(0, 5);

    const tasks = store.tasks
      .filter((t) => t.title && t.title.toLowerCase().includes(term))
      .slice(0, 5);

    const invoices = store.invoices
      .filter((inv) => (inv.invoice_number && inv.invoice_number.toLowerCase().includes(term)))
      .slice(0, 5);

    return { contacts, missions, contracts, activities, tasks, invoices };
  },

  // -------------------------------------------------------------
  // Backup & Reset
  // -------------------------------------------------------------
  getRawData(): CRMDataStore {
    return loadStore();
  },

  async restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    const store: CRMDataStore = {
      contacts: Array.isArray(data.contacts) ? data.contacts : [],
      missions: Array.isArray(data.missions) ? data.missions : [],
      contracts: Array.isArray(data.contracts) ? data.contracts : [],
      activities: Array.isArray(data.activities) ? data.activities : [],
      quotes: Array.isArray(data.quotes) ? data.quotes : [],
      invoices: Array.isArray(data.invoices) ? data.invoices : [],
      payments: Array.isArray(data.payments) ? data.payments : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      settings: data.settings || getInitialStore().settings
    };
    saveStore(store);
    return { success: true, message: 'Données restaurées avec succès.' };
  },

  async resetDemo(): Promise<{ success: boolean; message: string }> {
    saveStore(getInitialStore());
    return { success: true, message: 'Base de données réinitialisée à zéro (base propre et vide).' };
  }
};
