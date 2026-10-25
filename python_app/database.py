"""
Matt Konnect CRM - Module Base de données SQLite
Initialisation du schéma, des contraintes d'intégrité et des fonctions utilitaires.
"""

import sqlite3
import os
from typing import Optional, List, Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
try:
    os.makedirs(DATA_DIR, exist_ok=True)
except Exception:
    pass
DB_FILENAME = os.path.join(DATA_DIR, "matt_konnect.sqlite")

def get_connection(db_path: str = DB_FILENAME) -> sqlite3.Connection:
    """Retourne une connexion active avec contraintes de clés étrangères activées."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path: str = DB_FILENAME) -> None:
    """Crée les tables SQLite nécessaires si elles n'existent pas."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
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
    """)

    conn.commit()
    conn.close()

def convert_prospect_to_client(contact_id: int, db_path: str = DB_FILENAME) -> None:
    """
    Convertit un prospect en client dans SQLite sans doublon ni perte d'historique.
    Tous les devis, missions et activités restent rattachés au contact_id.
    """
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        UPDATE contacts
        SET status = 'client', updated_at = datetime('now', 'localtime')
        WHERE id = ?
    """, (contact_id,))

    cur.execute("""
        INSERT INTO activities (title, description, activity_date, category, duration_minutes, status, result, contact_id)
        VALUES ('Conversion officielle en Client', 'Prospect converti en client. L''ensemble de l''historique antérieur est conservé sans altération.', date('now', 'localtime'), 'Administration', 0, 'réalisé', 'Succès', ?)
    """, (contact_id,))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Base SQLite Matt Konnect initialisée avec succès.")
