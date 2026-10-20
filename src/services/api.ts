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
import { clientStorage } from './clientStorage.ts';

const BASE_URL = '/api';

// Detect whether backend server is online or if we are running in static/offline mode (e.g. Vercel static)
let isServerOnline: boolean | null = null;

export function setIsLocalMode(active: boolean): void {
  isServerOnline = !active;
}

export function getIsLocalMode(): boolean {
  return isServerOnline === false;
}

async function checkServer(): Promise<boolean> {
  if (isServerOnline !== null) return isServerOnline;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${BASE_URL}/dashboard`, { signal: controller.signal });
    clearTimeout(timeout);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      isServerOnline = true;
      return true;
    }
    isServerOnline = false;
    return false;
  } catch {
    isServerOnline = false;
    return false;
  }
}

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

async function tryServerOrFallback<T>(
  serverCall: () => Promise<Response>,
  fallbackCall: () => Promise<T>
): Promise<T> {
  if (isServerOnline === false) {
    return fallbackCall();
  }

  try {
    const res = await serverCall();
    const contentType = res.headers.get('content-type') || '';

    // If 404 or returning HTML (typical of Vercel static SPA rewrites when no API exists)
    if (res.status === 404 || (res.status === 200 && contentType.includes('text/html'))) {
      isServerOnline = false;
      return fallbackCall();
    }

    if (res.ok) {
      isServerOnline = true;
      return res.json();
    }

    // Server responded with an actual error (400, 422, etc.)
    return handleResponse<T>(res);
  } catch (err: any) {
    // Network failure / server unreachable -> switch to client fallback
    isServerOnline = false;
    return fallbackCall();
  }
}

export const api = {
  setForceLocalMode(force: boolean = true): void {
    isServerOnline = !force;
  },

  isLocalMode(): boolean {
    return isServerOnline === false;
  },

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/dashboard`),
      () => clientStorage.getDashboard()
    );
  },

  // Contacts
  async getContacts(params?: { status?: string; search?: string; include_archived?: boolean }): Promise<Contact[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.include_archived !== undefined) query.set('include_archived', String(params.include_archived));

    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/contacts?${query.toString()}`),
      () => clientStorage.getContacts(params)
    );
  },

  async getContact(id: number): Promise<ContactDetailResponse> {
    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/contacts/${id}`),
      () => clientStorage.getContact(id)
    );
  },

  async createContact(data: Partial<Contact>): Promise<Contact> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.createContact(data)
    );
  },

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/contacts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.updateContact(id, data)
    );
  },

  async convertProspectToClient(id: number): Promise<{ success: boolean; contact: Contact; message: string }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/contacts/${id}/convert`, {
          method: 'POST'
        }),
      () => clientStorage.convertProspectToClient(id)
    );
  },

  async archiveContact(id: number, is_archived: boolean): Promise<{ success: boolean }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/contacts/${id}/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_archived })
        }),
      () => clientStorage.archiveContact(id, is_archived)
    );
  },

  async deleteContact(id: number, force: boolean = false): Promise<{ success: boolean; message: string; can_force?: boolean }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/contacts/${id}${force ? '?force=true' : ''}`, {
          method: 'DELETE'
        }),
      () => clientStorage.deleteContact(id, force)
    );
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

    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/activities?${query.toString()}`),
      () => clientStorage.getActivities(params)
    );
  },

  async createActivity(data: Partial<Activity>): Promise<Activity> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.createActivity(data)
    );
  },

  async updateActivity(id: number, data: Partial<Activity>): Promise<Activity> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/activities/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.updateActivity(id, data)
    );
  },

  async deleteActivity(id: number): Promise<{ success: boolean }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/activities/${id}`, {
          method: 'DELETE'
        }),
      () => clientStorage.deleteActivity(id)
    );
  },

  // Missions
  async getMissions(params?: { contact_id?: number; status?: string; is_archived?: boolean }): Promise<Mission[]> {
    const query = new URLSearchParams();
    if (params?.contact_id) query.set('contact_id', String(params.contact_id));
    if (params?.status) query.set('status', params.status);
    if (params?.is_archived !== undefined) query.set('is_archived', String(params.is_archived));

    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/missions?${query.toString()}`),
      () => clientStorage.getMissions(params)
    );
  },

  async createMission(data: Partial<Mission>): Promise<Mission> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/missions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.createMission(data)
    );
  },

  async updateMission(id: number, data: Partial<Mission>): Promise<Mission> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/missions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.updateMission(id, data)
    );
  },

  async deleteMission(id: number): Promise<{ success: boolean }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/missions/${id}`, {
          method: 'DELETE'
        }),
      () => clientStorage.deleteMission(id)
    );
  },

  // Contracts
  async getContracts(): Promise<{ contracts: Contract[]; total_mrr: number }> {
    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/contracts`),
      () => clientStorage.getContracts()
    );
  },

  async createContract(data: Partial<Contract>): Promise<Contract> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/contracts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.createContract(data)
    );
  },

  async updateContract(id: number, data: Partial<Contract>): Promise<Contract> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/contracts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.updateContract(id, data)
    );
  },

  async deleteContract(id: number): Promise<{ success: boolean }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/contracts/${id}`, {
          method: 'DELETE'
        }),
      () => clientStorage.deleteContract(id)
    );
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
    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/finances`),
      () => clientStorage.getFinances()
    );
  },

  async createQuote(data: Partial<Quote>): Promise<Quote> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/quotes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.createQuote(data)
    );
  },

  async updateQuote(id: number, data: Partial<Quote>): Promise<Quote> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/quotes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.updateQuote(id, data)
    );
  },

  async deleteQuote(id: number): Promise<{ success: boolean; message: string }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/quotes/${id}`, {
          method: 'DELETE'
        }),
      () => clientStorage.deleteQuote(id)
    );
  },

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.createInvoice(data)
    );
  },

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/invoices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.updateInvoice(id, data)
    );
  },

  async deleteInvoice(id: number): Promise<{ success: boolean; message: string }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/invoices/${id}`, {
          method: 'DELETE'
        }),
      () => clientStorage.deleteInvoice(id)
    );
  },

  async recordPayment(data: {
    invoice_id: number;
    amount: number;
    payment_date: string;
    payment_method?: string;
    reference?: string;
    notes?: string;
  }): Promise<Payment> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.recordPayment(data)
    );
  },

  async deletePayment(id: number): Promise<{ success: boolean; message: string }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/payments/${id}`, {
          method: 'DELETE'
        }),
      () => clientStorage.deletePayment(id)
    );
  },

  // Tasks
  async getTasks(params?: { view?: string; contact_id?: number; mission_id?: number }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.view) query.set('view', params.view);
    if (params?.contact_id) query.set('contact_id', String(params.contact_id));
    if (params?.mission_id) query.set('mission_id', String(params.mission_id));

    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/tasks?${query.toString()}`),
      () => clientStorage.getTasks(params)
    );
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.createTask(data)
    );
  },

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.updateTask(id, data)
    );
  },

  async deleteTask(id: number): Promise<{ success: boolean }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/tasks/${id}`, {
          method: 'DELETE'
        }),
      () => clientStorage.deleteTask(id)
    );
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
    return tryServerOrFallback(
      () => fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}`),
      () => clientStorage.globalSearch(q)
    );
  },

  // Backup & Restore
  async restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/backup/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }),
      () => clientStorage.restoreBackup(data)
    );
  },

  async resetDemo(): Promise<{ success: boolean; message: string }> {
    return tryServerOrFallback(
      () =>
        fetch(`${BASE_URL}/backup/reset-demo`, {
          method: 'POST'
        }),
      () => clientStorage.resetDemo()
    );
  },

  // Client-side downloads for JSON, CSV, and SQLite backup
  downloadSqlite(): void {
    if (isServerOnline) {
      window.location.href = `${BASE_URL}/backup/sqlite`;
    } else {
      this.downloadJsonBackup();
    }
  },

  downloadJsonBackup(): void {
    if (isServerOnline) {
      window.location.href = `${BASE_URL}/backup/json`;
      return;
    }
    const data = clientStorage.getRawData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde_matt_konnect_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadCsv(table: string): void {
    if (isServerOnline) {
      window.location.href = `${BASE_URL}/backup/csv/${table}`;
      return;
    }
    const data = clientStorage.getRawData();
    const rows = (data as any)[table] || [];
    if (rows.length === 0) {
      const emptyBlob = new Blob(['aucun enregistrement\n'], { type: 'text/csv;charset=utf-8;' });
      const emptyUrl = URL.createObjectURL(emptyBlob);
      const a = document.createElement('a');
      a.href = emptyUrl;
      a.download = `export_${table}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(emptyUrl);
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(';')];
    for (const row of rows) {
      const line = headers.map((h) => {
        const val = row[h] === null || row[h] === undefined ? '' : String(row[h]).replace(/"/g, '""');
        return `"${val}"`;
      });
      csvLines.push(line.join(';'));
    }

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${table}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
