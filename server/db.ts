import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic;
let db: Database;

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? '/tmp/matt_konnect_data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'matt_konnect.sqlite');

export async function getDatabase(): Promise<Database> {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data directory, SQLite will remain in-memory:', err);
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      initSchema(db);
      return db;
    }
  } catch (e) {
    console.warn('Could not read existing SQLite database file:', e);
  }

  db = new SQL.Database();
  initSchema(db);
  seedInitialData(db);
  persistDatabase();
  return db;
}

export function persistDatabase(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (e) {
    console.error('Failed to persist SQLite database:', e);
  }
}

export function getDatabaseBinary(): Buffer {
  if (!db) throw new Error('Database not initialized');
  return Buffer.from(db.export());
}

function initSchema(database: Database) {
  database.run(`PRAGMA foreign_keys = ON;`);

  database.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT,
      contact_name TEXT NOT NULL,
      role_title TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      address TEXT,
      postal_code TEXT,
      city TEXT,
      industry TEXT,
      lead_source TEXT DEFAULT 'prospection',
      status TEXT CHECK(status IN ('prospect', 'client', 'client_inactif', 'partenaire')) NOT NULL DEFAULT 'prospect',
      next_action TEXT,
      follow_up_date TEXT,
      notes TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
      service_category TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      description TEXT,
      start_date TEXT,
      expected_delivery_date TEXT,
      closed_date TEXT,
      status TEXT CHECK(status IN ('à cadrer', 'à chiffrer', 'devis envoyé', 'en attente', 'planifiée', 'en cours', 'en pause', 'livrée', 'clôturée', 'annulée')) DEFAULT 'à cadrer',
      estimated_amount REAL DEFAULT 0,
      accepted_amount REAL DEFAULT 0,
      time_budget_hours REAL DEFAULT 0,
      notes TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      activity_date TEXT NOT NULL,
      activity_time TEXT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL,
      category TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 0,
      status TEXT CHECK(status IN ('réalisé', 'prévu', 'annulé')) DEFAULT 'réalisé',
      result TEXT,
      next_action TEXT,
      attachment_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      frequency TEXT CHECK(frequency IN ('mensuelle', 'trimestrielle', 'semestrielle', 'annuelle')) NOT NULL DEFAULT 'mensuelle',
      amount_per_period REAL NOT NULL,
      next_renewal_date TEXT,
      notice_period_days INTEGER DEFAULT 30,
      included_hours_per_month REAL DEFAULT 0,
      status TEXT CHECK(status IN ('brouillon', 'en attente', 'actif', 'suspendu', 'résilié', 'expiré')) DEFAULT 'actif',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT UNIQUE NOT NULL,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
      mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL,
      issue_date TEXT NOT NULL,
      validity_date TEXT,
      amount_ht REAL NOT NULL,
      tax_rate REAL DEFAULT 20.0,
      amount_ttc REAL NOT NULL,
      status TEXT CHECK(status IN ('brouillon', 'envoyé', 'accepté', 'refusé', 'expiré')) DEFAULT 'envoyé',
      document_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
      mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL,
      quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      amount_ht REAL NOT NULL,
      tax_rate REAL DEFAULT 20.0,
      amount_ttc REAL NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('non facturé', 'à payer', 'partiellement payé', 'payé', 'en retard')) DEFAULT 'à payer',
      document_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'Virement',
      reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      priority TEXT CHECK(priority IN ('basse', 'normale', 'haute', 'urgente')) DEFAULT 'normale',
      status TEXT CHECK(status IN ('à faire', 'en cours', 'terminée', 'annulée')) DEFAULT 'à faire',
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL,
      contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
      task_type TEXT DEFAULT 'technique',
      estimated_duration_minutes INTEGER DEFAULT 0,
      actual_duration_minutes INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function seedInitialData(database: Database) {
  // Only initialize default settings if not already present
  database.run(`
    INSERT OR REPLACE INTO settings (key, value) VALUES
    ('company_name', 'Matt Konnect'),
    ('owner_name', 'Matt'),
    ('default_vat_rate', '20.0'),
    ('currency', 'EUR'),
    ('hourly_rate', '85.0');
  `);
}

export function clearAllData(): void {
  if (!db) throw new Error('Database not initialized');
  db.run(`PRAGMA foreign_keys = OFF;`);
  const tables = ['payments', 'invoices', 'quotes', 'tasks', 'activities', 'contracts', 'missions', 'contacts'];
  for (const table of tables) {
    db.run(`DELETE FROM ${table};`);
  }
  db.run(`DELETE FROM sqlite_sequence WHERE name IN ('payments', 'invoices', 'quotes', 'tasks', 'activities', 'contracts', 'missions', 'contacts');`);
  db.run(`PRAGMA foreign_keys = ON;`);
  persistDatabase();
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  try {
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  if (params.length > 0) {
    const stmt = db.prepare(sql);
    try {
      stmt.run(params);
    } finally {
      stmt.free();
    }
  } else {
    db.run(sql);
  }
  persistDatabase();
}

export function runInsert(sql: string, params: any[] = []): number {
  if (!db) throw new Error('Database not initialized');
  if (params.length > 0) {
    const stmt = db.prepare(sql);
    try {
      stmt.run(params);
    } finally {
      stmt.free();
    }
  } else {
    db.run(sql);
  }
  const res = db.exec('SELECT last_insert_rowid() as id;');
  persistDatabase();
  return res[0]?.values[0]?.[0] as number || 0;
}

export function exportTableToCsv(tableName: string): string {
  const rows = queryAll(`SELECT * FROM ${tableName}`);
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(header => {
      const val = (row as any)[header];
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    csvLines.push(values.join(','));
  }
  return csvLines.join('\n');
}

export function exportAllToJson(): any {
  return {
    meta: {
      exported_at: new Date().toISOString(),
      app: 'Matt Konnect CRM',
      version: '1.0.0'
    },
    settings: queryAll('SELECT * FROM settings'),
    contacts: queryAll('SELECT * FROM contacts'),
    missions: queryAll('SELECT * FROM missions'),
    activities: queryAll('SELECT * FROM activities'),
    contracts: queryAll('SELECT * FROM contracts'),
    quotes: queryAll('SELECT * FROM quotes'),
    invoices: queryAll('SELECT * FROM invoices'),
    payments: queryAll('SELECT * FROM payments'),
    tasks: queryAll('SELECT * FROM tasks')
  };
}

export function restoreFromJson(data: any): { success: boolean; message: string } {
  if (!db) throw new Error('Database not initialized');
  if (!data || typeof data !== 'object') {
    throw new Error('Données de sauvegarde invalides.');
  }

  // Clear tables in reverse dependency order
  db.run(`PRAGMA foreign_keys = OFF;`);
  const tables = ['payments', 'invoices', 'quotes', 'tasks', 'activities', 'contracts', 'missions', 'contacts', 'settings'];
  for (const table of tables) {
    db.run(`DELETE FROM ${table};`);
  }

  // Insert restored rows
  if (Array.isArray(data.settings)) {
    for (const r of data.settings) {
      db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [r.key, r.value]);
    }
  }
  if (Array.isArray(data.contacts)) {
    for (const r of data.contacts) {
      db.run(`INSERT INTO contacts (id, company_name, contact_name, role_title, email, phone, website, address, postal_code, city, industry, lead_source, status, next_action, follow_up_date, notes, is_archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.company_name, r.contact_name, r.role_title, r.email, r.phone, r.website, r.address, r.postal_code, r.city, r.industry, r.lead_source, r.status, r.next_action, r.follow_up_date, r.notes, r.is_archived || 0, r.created_at, r.updated_at]);
    }
  }
  if (Array.isArray(data.missions)) {
    for (const r of data.missions) {
      db.run(`INSERT INTO missions (id, reference, title, contact_id, service_category, is_recurring, description, start_date, expected_delivery_date, closed_date, status, estimated_amount, accepted_amount, time_budget_hours, notes, is_archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.reference, r.title, r.contact_id, r.service_category, r.is_recurring || 0, r.description, r.start_date, r.expected_delivery_date, r.closed_date, r.status, r.estimated_amount || 0, r.accepted_amount || 0, r.time_budget_hours || 0, r.notes, r.is_archived || 0, r.created_at, r.updated_at]);
    }
  }
  if (Array.isArray(data.contracts)) {
    for (const r of data.contracts) {
      db.run(`INSERT INTO contracts (id, reference, contact_id, title, description, start_date, end_date, frequency, amount_per_period, next_renewal_date, notice_period_days, included_hours_per_month, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.reference, r.contact_id, r.title, r.description, r.start_date, r.end_date, r.frequency, r.amount_per_period, r.next_renewal_date, r.notice_period_days, r.included_hours_per_month, r.status, r.notes, r.created_at, r.updated_at]);
    }
  }
  if (Array.isArray(data.activities)) {
    for (const r of data.activities) {
      db.run(`INSERT INTO activities (id, title, description, activity_date, activity_time, contact_id, mission_id, category, duration_minutes, status, result, next_action, attachment_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.title, r.description, r.activity_date, r.activity_time, r.contact_id, r.mission_id, r.category, r.duration_minutes || 0, r.status, r.result, r.next_action, r.attachment_url, r.created_at, r.updated_at]);
    }
  }
  if (Array.isArray(data.quotes)) {
    for (const r of data.quotes) {
      db.run(`INSERT INTO quotes (id, quote_number, contact_id, mission_id, issue_date, validity_date, amount_ht, tax_rate, amount_ttc, status, document_url, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.quote_number, r.contact_id, r.mission_id, r.issue_date, r.validity_date, r.amount_ht, r.tax_rate, r.amount_ttc, r.status, r.document_url, r.notes, r.created_at, r.updated_at]);
    }
  }
  if (Array.isArray(data.invoices)) {
    for (const r of data.invoices) {
      db.run(`INSERT INTO invoices (id, invoice_number, contact_id, mission_id, quote_id, issue_date, due_date, amount_ht, tax_rate, amount_ttc, payment_status, document_url, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.invoice_number, r.contact_id, r.mission_id, r.quote_id, r.issue_date, r.due_date, r.amount_ht, r.tax_rate, r.amount_ttc, r.payment_status, r.document_url, r.notes, r.created_at, r.updated_at]);
    }
  }
  if (Array.isArray(data.payments)) {
    for (const r of data.payments) {
      db.run(`INSERT INTO payments (id, invoice_id, contact_id, amount, payment_date, payment_method, reference, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.invoice_id, r.contact_id, r.amount, r.payment_date, r.payment_method, r.reference, r.notes, r.created_at]);
    }
  }
  if (Array.isArray(data.tasks)) {
    for (const r of data.tasks) {
      db.run(`INSERT INTO tasks (id, title, description, due_date, priority, status, contact_id, mission_id, contract_id, task_type, estimated_duration_minutes, actual_duration_minutes, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.title, r.description, r.due_date, r.priority, r.status, r.contact_id, r.mission_id, r.contract_id, r.task_type, r.estimated_duration_minutes, r.actual_duration_minutes, r.completed_at, r.created_at, r.updated_at]);
    }
  }

  db.run(`PRAGMA foreign_keys = ON;`);
  persistDatabase();
  return { success: true, message: 'Restauration effectuée avec succès.' };
}

export function resetDemoDatabase(): void {
  if (!db) throw new Error('Database not initialized');
  db.run(`PRAGMA foreign_keys = OFF;`);
  const tables = ['payments', 'invoices', 'quotes', 'tasks', 'activities', 'contracts', 'missions', 'contacts', 'settings'];
  for (const table of tables) {
    db.run(`DROP TABLE IF EXISTS ${table};`);
  }
  db.run(`PRAGMA foreign_keys = ON;`);
  initSchema(db);
  seedInitialData(db);
  persistDatabase();
}

