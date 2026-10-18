import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic;
let db: Database;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'matt_konnect.sqlite');

export async function getDatabase(): Promise<Database> {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      initSchema(db);
      return db;
    } catch (e) {
      console.error('Error loading existing SQLite database, creating new one:', e);
    }
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
  // Check if contacts already exist
  const countRes = database.exec(`SELECT COUNT(*) as count FROM contacts;`);
  const count = countRes.length > 0 && countRes[0].values.length > 0 ? (countRes[0].values[0][0] as number) : 0;
  if (count > 0) return;

  const today = new Date().toISOString().split('T')[0];

  // Settings
  database.run(`
    INSERT OR REPLACE INTO settings (key, value) VALUES
    ('company_name', 'Matt Konnect'),
    ('owner_name', 'Matt'),
    ('default_vat_rate', '20.0'),
    ('currency', 'EUR'),
    ('hourly_rate', '85.0');
  `);

  // Contacts: 2 Clients, 2 Prospects, 1 Partenaire
  database.run(`
    INSERT INTO contacts (company_name, contact_name, role_title, email, phone, website, address, postal_code, city, industry, lead_source, status, next_action, follow_up_date, notes)
    VALUES
    ('Atelier Bois & Création', 'Julien Mercier', 'Gérant & Artisan', 'contact@atelierboiscreation.fr', '+33 6 12 34 56 78', 'https://atelierboiscreation.fr', '14 Rue de la Menuiserie', '69003', 'Lyon', 'Artisanat & Décoration', 'recommandation', 'client', 'Valider maquette v2 catalogue', date('now', '+3 days'), 'Client fidèle depuis 2024. Très satisfait de la première refonte WordPress.'),
    ('Cabinet Horizon Conseil', 'Sophie Delorme', 'Directrice Associée', 's.delorme@horizon-conseil.com', '+33 1 45 67 89 00', 'https://horizon-conseil.com', '28 Boulevard Haussmann', '75009', 'Paris', 'Conseil RH & Management', 'réseau', 'client', 'Point mensuel maintenance & reporting GA4', date('now', '+7 days'), 'Contrat de maintenance WordPress annuel + suivi Google Analytics 4.'),
    ('BioNatura France', 'Marc Vigneron', 'Responsable E-commerce', 'm.vigneron@bionatura.fr', '+33 6 98 76 54 32', 'https://bionatura.fr', '5 Avenue des Maraîchers', '33000', 'Bordeaux', 'Agroalimentaire Bio', 'prospection', 'prospect', 'Relancer proposition d''audit SEO et refonte WooCommerce', date('now', '+1 days'), 'Prospect chaud suite à échange LinkedIn. Souhaite refondre sa boutique sous WordPress/WooCommerce.'),
    ('ImmoPrestige Méditerranée', 'Carine Faure', 'Fondatrice', 'carine@immoprestige-med.com', '+33 4 93 11 22 33', 'https://immoprestige-med.com', '12 Promenade des Flots', '06000', 'Nice', 'Immobilier haut de gamme', 'site web', 'prospect', 'Envoyer devis passerelle API logiciel immobilier', date('now', '+2 days'), 'Formulaire reçu sur le site web. Demande d''interconnexion API logicielle.'),
    ('Studio Graphic Pixel', 'Alexandre Brun', 'Directeur Artistique', 'alex@graphicpixel.design', '+33 6 44 55 66 77', 'https://graphicpixel.design', '8 Rue des Arts', '44000', 'Nantes', 'Design & Graphisme', 'réseau', 'partenaire', 'Organiser café visio échange projets clients web', date('now', '+14 days'), 'Studio de graphisme partenaire. Nous renvoie des développements web complexes.');
  `);

  // Missions
  database.run(`
    INSERT INTO missions (reference, title, contact_id, service_category, is_recurring, description, start_date, expected_delivery_date, status, estimated_amount, accepted_amount, time_budget_hours, notes)
    VALUES
    ('MIS-2026-001', 'Refonte intégrale WordPress & WooCommerce', 1, 'Refonte site web', 0, 'Modernisation du thème sur-mesure, optimisation mobile et parcours d''achat e-commerce.', date('now', '-30 days'), date('now', '+15 days'), 'en cours', 3800.0, 3800.0, 45.0, 'Paiement d''acompte 40% encaissé.'),
    ('MIS-2026-002', 'Audit SEO & Plan de taggage GA4 / GTM', 2, 'Configuration GA4 et Google Tag Manager', 0, 'Audit sémantique, configuration des balises et mise en place d''un tableau de bord Looker Studio.', date('now', '-15 days'), date('now', '+5 days'), 'livrée', 1450.0, 1450.0, 18.0, 'Validation finale reçue ce matin.'),
    ('MIS-2026-003', 'Audit technique & architecture WooCommerce', 3, 'Audit de site', 0, 'Analyse des temps de chargement, des plugins obsolètes et préconisations de refonte.', date('now', '+2 days'), date('now', '+12 days'), 'devis envoyé', 950.0, 0.0, 12.0, 'Devis transmis hier suite à la réunion de cadrage.');
  `);

  // Contracts (recurring)
  database.run(`
    INSERT INTO contracts (reference, contact_id, title, description, start_date, frequency, amount_per_period, next_renewal_date, notice_period_days, included_hours_per_month, status, notes)
    VALUES
    ('CTR-2026-01', 2, 'Maintenance Sérénité WordPress & Sécurité', 'Sauvegardes quotidiennes externalisées, màj testées en pré-prod, monitoring 24/7 et 3h de support mensuel inclus.', date('now', '-60 days'), 'mensuelle', 250.0, date('now', '+25 days'), 30, 3.0, 'actif', 'Facturation le 1er de chaque mois.'),
    ('CTR-2026-02', 1, 'Hébergement haute disponibilité & infogérance', 'Serveur infogéré VPS Cloud, certificats SSL, CDN Cloudflare et surveillance proactive.', date('now', '-90 days'), 'trimestrielle', 360.0, date('now', '+10 days'), 30, 1.0, 'actif', 'Échéance trimestrielle à renouveler bientôt.');
  `);

  // Activities (Journal de travail)
  database.run(`
    INSERT INTO activities (title, description, activity_date, activity_time, contact_id, mission_id, category, duration_minutes, status, result, next_action)
    VALUES
    ('Développement panier AJAX et refonte checkout', 'Intégration du composant panier glissant et sécurisation des étapes de validation Stripe.', date('now'), '10:30', 1, 1, 'Développement', 120, 'réalisé', 'Composant fonctionnel en environnement de test.', 'Tester les callbacks webhooks'),
    ('Point de synchronisation sprint & démonstration', 'Présentation des templates produits personnalisés à Julien Mercier par visio.', date('now', '-1 days'), '14:00', 1, 1, 'Rendez-vous', 45, 'réalisé', 'Client ravi du rendu visuel et de la réactivité.', 'Ajuster marge intérieure sur mobile'),
    ('Vérification sauvegardes et mise à jour core WP 6.8', 'Contrôle mensuel du site horizon-conseil.com, màj ACF Pro et vérification temps de réponse TTFB.', date('now', '-2 days'), '09:15', 2, NULL, 'Maintenance', 60, 'réalisé', 'Mises à jour sans incident, TTFB à 180ms.', 'Envoyer compte rendu mensuel'),
    ('Réunion de cadrage projet e-commerce', 'Échange téléphonique approfondi avec Marc Vigneron sur les freins actuels de BioNatura.', date('now', '-3 days'), '16:00', 3, 3, 'Réunion de cadrage', 40, 'réalisé', 'Besoin clarifié : WooCommerce trop lent, besoin d''un audit préalable.', 'Rédiger le devis d''audit SEO et technique'),
    ('Veille technique & benchmark Next.js / WordPress Headless', 'Exploration des nouveautés de l''API REST WordPress pour les futurs projets agency.', date('now', '-4 days'), '11:00', NULL, NULL, 'Analyse technique', 90, 'réalisé', 'Notes enregistrées dans la base interne.', 'Tester sur un POC');
  `);

  // Quotes (Devis)
  database.run(`
    INSERT INTO quotes (quote_number, contact_id, mission_id, issue_date, validity_date, amount_ht, tax_rate, amount_ttc, status, notes)
    VALUES
    ('DEV-2026-042', 1, 1, date('now', '-35 days'), date('now', '-5 days'), 3800.0, 20.0, 4560.0, 'accepté', 'Devis signé électroniquement le 15 du mois dernier.'),
    ('DEV-2026-048', 2, 2, date('now', '-20 days'), date('now', '+10 days'), 1450.0, 20.0, 1740.0, 'accepté', 'Bon pour accord reçu par retour de mail.'),
    ('DEV-2026-051', 3, 3, date('now', '-2 days'), date('now', '+28 days'), 950.0, 20.0, 1140.0, 'envoyé', 'En attente de validation par la direction financière.');
  `);

  // Invoices (Factures)
  database.run(`
    INSERT INTO invoices (invoice_number, contact_id, mission_id, quote_id, issue_date, due_date, amount_ht, tax_rate, amount_ttc, payment_status, notes)
    VALUES
    ('FAC-2026-021', 1, 1, 1, date('now', '-28 days'), date('now', '-14 days'), 1520.0, 20.0, 1824.0, 'payé', 'Acompte 40% sur la refonte e-commerce.'),
    ('FAC-2026-022', 2, 2, 2, date('now', '-5 days'), date('now', '+25 days'), 1450.0, 20.0, 1740.0, 'à payer', 'Facture solde mission GA4/GTM.'),
    ('FAC-2026-023', 2, NULL, NULL, date('now', '-15 days'), date('now', '+15 days'), 250.0, 20.0, 300.0, 'payé', 'Abonnement maintenance mensuelle Mars 2026.');
  `);

  // Payments (Règlements)
  database.run(`
    INSERT INTO payments (invoice_id, contact_id, amount, payment_date, payment_method, reference, notes)
    VALUES
    (1, 1, 1824.0, date('now', '-26 days'), 'Virement', 'VIR-ATELIER-01', 'Règlement acompte reçu sur compte professionnel.'),
    (3, 2, 300.0, date('now', '-10 days'), 'Virement', 'VIR-HORIZON-MARS', 'Virement bancaire automatique.');
  `);

  // Tasks (Tâches et relances)
  database.run(`
    INSERT INTO tasks (title, description, due_date, priority, status, contact_id, mission_id, contract_id, task_type, estimated_duration_minutes)
    VALUES
    ('Relance téléphonique devis audit BioNatura', 'Appeler Marc Vigneron pour vérifier s''il a des questions sur l''audit chiffré.', date('now', '+1 days'), 'haute', 'à faire', 3, 3, NULL, 'relance_commerciale', 15),
    ('Finaliser intégration responsive panier Atelier Bois', 'Résoudre le débordement CSS sur écran mobile < 380px.', date('now'), 'urgente', 'en cours', 1, 1, NULL, 'technique', 90),
    ('Renouvellement contrat hébergement Atelier Bois', 'Envoyer la proposition de renouvellement pour le trimestre suivant.', date('now', '+5 days'), 'normale', 'à faire', 1, NULL, 2, 'renouvellement', 20),
    ('Transmission livrable GA4 Looker Studio Sophie Delorme', 'Envoyer le lien du dashboard sécurisé et la note synthétique.', date('now', '+2 days'), 'haute', 'à faire', 2, 2, NULL, 'livraison', 30);
  `);
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

