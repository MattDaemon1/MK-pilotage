export type ContactStatus = 'prospect' | 'client' | 'client_inactif' | 'partenaire';

export type LeadSource = 'prospection' | 'recommandation' | 'site web' | 'réseau' | 'autre';

export type MissionStatus =
  | 'à cadrer'
  | 'à chiffrer'
  | 'devis envoyé'
  | 'en attente'
  | 'planifiée'
  | 'en cours'
  | 'en pause'
  | 'livrée'
  | 'clôturée'
  | 'annulée';

export type ActivityCategory =
  | 'Appel'
  | 'Email'
  | 'Rendez-vous'
  | 'Prospection'
  | 'Audit de site'
  | 'Analyse technique'
  | 'Développement'
  | 'Maintenance'
  | 'Correction bug'
  | 'Mise à jour WordPress'
  | 'Formation'
  | 'Conseil'
  | 'Réunion de cadrage'
  | 'Livraison'
  | 'Compte rendu'
  | 'Relance'
  | 'Administration'
  | 'Autre';

export type ActivityStatus = 'réalisé' | 'prévu' | 'annulé';

export type ContractFrequency = 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';

export type ContractStatus = 'brouillon' | 'en attente' | 'actif' | 'suspendu' | 'résilié' | 'expiré';

export type QuoteStatus = 'brouillon' | 'envoyé' | 'accepté' | 'refusé' | 'expiré';

export type InvoicePaymentStatus = 'non facturé' | 'à payer' | 'partiellement payé' | 'payé' | 'en retard';

export type TaskPriority = 'basse' | 'normale' | 'haute' | 'urgente';

export type TaskStatus = 'à faire' | 'en cours' | 'terminée' | 'annulée';

export interface Contact {
  id: number;
  company_name: string | null;
  contact_name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  industry: string | null;
  lead_source: LeadSource;
  status: ContactStatus;
  next_action: string | null;
  follow_up_date: string | null;
  notes: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  active_missions_count?: number;
  active_contracts_count?: number;
  last_interaction_date?: string | null;
  total_collected?: number;
}

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  activity_date: string;
  activity_time: string | null;
  contact_id: number | null;
  mission_id: number | null;
  category: ActivityCategory;
  duration_minutes: number;
  status: ActivityStatus;
  result: string | null;
  next_action: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  contact_name?: string | null;
  contact_status?: ContactStatus;
  mission_title?: string | null;
  mission_reference?: string | null;
}

export interface Mission {
  id: number;
  reference: string;
  title: string;
  contact_id: number;
  service_category: string;
  is_recurring: number;
  description: string | null;
  start_date: string | null;
  expected_delivery_date: string | null;
  closed_date: string | null;
  status: MissionStatus;
  estimated_amount: number;
  accepted_amount: number;
  time_budget_hours: number;
  notes: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  contact_name?: string;
  contact_email?: string | null;
  actual_hours_spent?: number;
  billed_amount?: number;
  paid_amount?: number;
  pending_tasks_count?: number;
}

export interface Contract {
  id: number;
  reference: string;
  contact_id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  frequency: ContractFrequency;
  amount_per_period: number;
  next_renewal_date: string | null;
  notice_period_days: number;
  included_hours_per_month: number;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  contact_name?: string;
  contact_email?: string | null;
  normalized_mrr?: number;
}

export interface Quote {
  id: number;
  quote_number: string;
  contact_id: number;
  mission_id: number | null;
  issue_date: string;
  validity_date: string | null;
  amount_ht: number;
  tax_rate: number;
  amount_ttc: number;
  status: QuoteStatus;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  company_name?: string | null;
  contact_name?: string;
  mission_title?: string | null;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  contact_id: number;
  mission_id: number | null;
  quote_id: number | null;
  issue_date: string;
  due_date: string;
  amount_ht: number;
  tax_rate: number;
  amount_ttc: number;
  payment_status: InvoicePaymentStatus;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  company_name?: string | null;
  contact_name?: string;
  mission_title?: string | null;
  paid_amount?: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  contact_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
  invoice_number?: string;
  company_name?: string | null;
  contact_name?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  contact_id: number | null;
  mission_id: number | null;
  contract_id: number | null;
  task_type: string;
  estimated_duration_minutes: number;
  actual_duration_minutes: number;
  completed_at: string | null;
  created_at: string;
  updated_at?: string;
  company_name?: string | null;
  contact_name?: string | null;
  mission_title?: string | null;
  contract_title?: string | null;
}

export interface ContactDetailResponse {
  contact: Contact;
  activities: Activity[];
  missions: Mission[];
  contracts: Contract[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  tasks: Task[];
  metrics: {
    total_accepted: number;
    total_invoiced: number;
    total_collected: number;
    balance_due: number;
    active_missions_count: number;
    running_missions_amount: number;
    active_contracts_count: number;
    total_hours_spent: number;
    last_interaction: Activity | null;
    next_action: string | null;
    follow_up_date: string | null;
  };
}

export interface DashboardData {
  active_prospects: number;
  active_clients: number;
  active_missions: number;
  overdue_tasks: number;
  today_tasks: number;
  pending_quotes: number;
  renewing_contracts_count: number;
  renewing_contracts: Contract[];
  follow_ups_needed: Array<{
    id: number;
    contact_name: string;
    company_name: string | null;
    next_action: string;
    follow_up_date: string;
  }>;
  mrr: number;
  signed_revenue: number;
  invoiced_revenue: number;
  collected_revenue: number;
  remaining_revenue: number;
  overdue_amount: number;
  time_spent_by_category: Array<{ category: string; total_minutes: number }>;
  time_spent_by_client: Array<{ client_name: string; total_minutes: number }>;
  recent_activities: Activity[];
}
