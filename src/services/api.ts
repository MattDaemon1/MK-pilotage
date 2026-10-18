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
  DashboardData
} from '../types/crm.ts';

const BASE_URL = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMessage = 'Une erreur est survenue';
    try {
      const data = await res.json();
      if (data.error) errMessage = data.error;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    const res = await fetch(`${BASE_URL}/dashboard`);
    return handleResponse<DashboardData>(res);
  },

  // Contacts
  async getContacts(params?: { status?: string; search?: string; include_archived?: boolean }): Promise<Contact[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.include_archived !== undefined) query.set('include_archived', String(params.include_archived));
    const res = await fetch(`${BASE_URL}/contacts?${query.toString()}`);
    return handleResponse<Contact[]>(res);
  },

  async getContact(id: number): Promise<ContactDetailResponse> {
    const res = await fetch(`${BASE_URL}/contacts/${id}`);
    return handleResponse<ContactDetailResponse>(res);
  },

  async createContact(data: Partial<Contact>): Promise<Contact> {
    const res = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Contact>(res);
  },

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    const res = await fetch(`${BASE_URL}/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Contact>(res);
  },

  async convertProspectToClient(id: number): Promise<{ success: boolean; contact: Contact; message: string }> {
    const res = await fetch(`${BASE_URL}/contacts/${id}/convert`, {
      method: 'POST'
    });
    return handleResponse<{ success: boolean; contact: Contact; message: string }>(res);
  },

  async archiveContact(id: number, is_archived: boolean): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/contacts/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived })
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async deleteContact(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/contacts/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Activities (Journal)
  async getActivities(params?: {
    contact_id?: number;
    mission_id?: number;
    category?: string;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<Activity[]> {
    const query = new URLSearchParams();
    if (params?.contact_id) query.set('contact_id', String(params.contact_id));
    if (params?.mission_id) query.set('mission_id', String(params.mission_id));
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`${BASE_URL}/activities?${query.toString()}`);
    return handleResponse<Activity[]>(res);
  },

  async createActivity(data: Partial<Activity>): Promise<Activity> {
    const res = await fetch(`${BASE_URL}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Activity>(res);
  },

  async updateActivity(id: number, data: Partial<Activity>): Promise<Activity> {
    const res = await fetch(`${BASE_URL}/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Activity>(res);
  },

  async deleteActivity(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/activities/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Missions
  async getMissions(params?: { contact_id?: number; status?: string; is_archived?: boolean }): Promise<Mission[]> {
    const query = new URLSearchParams();
    if (params?.contact_id) query.set('contact_id', String(params.contact_id));
    if (params?.status) query.set('status', params.status);
    if (params?.is_archived !== undefined) query.set('is_archived', String(params.is_archived));
    const res = await fetch(`${BASE_URL}/missions?${query.toString()}`);
    return handleResponse<Mission[]>(res);
  },

  async createMission(data: Partial<Mission>): Promise<Mission> {
    const res = await fetch(`${BASE_URL}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Mission>(res);
  },

  async updateMission(id: number, data: Partial<Mission>): Promise<Mission> {
    const res = await fetch(`${BASE_URL}/missions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Mission>(res);
  },

  async deleteMission(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/missions/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Contracts
  async getContracts(): Promise<{ contracts: Contract[]; total_mrr: number }> {
    const res = await fetch(`${BASE_URL}/contracts`);
    return handleResponse<{ contracts: Contract[]; total_mrr: number }>(res);
  },

  async createContract(data: Partial<Contract>): Promise<Contract> {
    const res = await fetch(`${BASE_URL}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Contract>(res);
  },

  async updateContract(id: number, data: Partial<Contract>): Promise<Contract> {
    const res = await fetch(`${BASE_URL}/contracts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Contract>(res);
  },

  async deleteContract(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/contracts/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Finances
  async getFinances(): Promise<{
    quotes: Quote[];
    invoices: Invoice[];
    payments: Payment[];
    summary: {
      signed_amount: number;
      invoiced_amount: number;
      collected_amount: number;
      remaining_to_collect: number;
      overdue_amount: number;
      overdue_count: number;
    };
  }> {
    const res = await fetch(`${BASE_URL}/finances`);
    return handleResponse<any>(res);
  },

  async createQuote(data: Partial<Quote>): Promise<Quote> {
    const res = await fetch(`${BASE_URL}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Quote>(res);
  },

  async updateQuote(id: number, data: Partial<Quote>): Promise<Quote> {
    const res = await fetch(`${BASE_URL}/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Quote>(res);
  },

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const res = await fetch(`${BASE_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Invoice>(res);
  },

  async recordPayment(data: {
    invoice_id: number;
    amount: number;
    payment_date: string;
    payment_method?: string;
    reference?: string;
    notes?: string;
  }): Promise<Payment> {
    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Payment>(res);
  },

  // Tasks
  async getTasks(params?: { view?: string; contact_id?: number; mission_id?: number }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.view) query.set('view', params.view);
    if (params?.contact_id) query.set('contact_id', String(params.contact_id));
    if (params?.mission_id) query.set('mission_id', String(params.mission_id));
    const res = await fetch(`${BASE_URL}/tasks?${query.toString()}`);
    return handleResponse<Task[]>(res);
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Task>(res);
  },

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Task>(res);
  },

  async deleteTask(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Search
  async globalSearch(q: string): Promise<{
    contacts: any[];
    missions: any[];
    contracts: any[];
    activities: any[];
    tasks: any[];
    invoices: any[];
  }> {
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}`);
    return handleResponse<any>(res);
  },

  // Backup & Restore
  async restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async resetDemo(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/backup/reset-demo`, {
      method: 'POST'
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  }
};

// Utilities
export function formatEuro(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDateFr(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0 min';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins} min`;
}
