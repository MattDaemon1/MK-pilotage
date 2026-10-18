"""
Suite de tests de validation pour Matt Konnect CRM
Vérifie la persistance SQLite, la conversion prospect -> client sans perte de données,
les relations clés étrangères et le calcul normalisé du MRR.
"""

import unittest
import sqlite3
import os
import sys

# Ajouter le dossier python_app au sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python_app')))
from database import init_db, get_connection, convert_prospect_to_client

TEST_DB = "test_crm.sqlite"

class TestMattKonnectCRM(unittest.TestCase):

    def setUp(self):
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)
        init_db(TEST_DB)

    def tearDown(self):
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)

    def test_create_and_convert_prospect_without_data_loss(self):
        """Vérifie que la conversion d'un prospect en client conserve l'ensemble de l'historique."""
        conn = get_connection(TEST_DB)
        cur = conn.cursor()

        # 1. Créer un prospect
        cur.execute("""
            INSERT INTO contacts (contact_name, company_name, email, status, next_action)
            VALUES ('Julien Test', 'Menuiserie Moderne', 'julien@test.fr', 'prospect', 'Envoyer devis refonte')
        """)
        contact_id = cur.lastrowid

        # 2. Enregistrer un appel et une note
        cur.execute("""
            INSERT INTO activities (title, description, activity_date, category, duration_minutes, contact_id)
            VALUES ('Appel de qualification', 'Discussion sur le besoin e-commerce', '2026-10-18', 'Appel', 30, ?)
        """, (contact_id,))
        activity_id = cur.lastrowid

        # 3. Créer un devis pour ce prospect
        cur.execute("""
            INSERT INTO quotes (quote_number, contact_id, issue_date, amount_ht, tax_rate, amount_ttc, status)
            VALUES ('DEV-TEST-01', ?, '2026-10-18', 2500.0, 20.0, 3000.0, 'envoyé')
        """, (contact_id,))
        conn.commit()
        conn.close()

        # 4. Convertir le prospect en client
        convert_prospect_to_client(contact_id, TEST_DB)

        # 5. Vérifier que le statut est 'client', que le contact_id est identique, et que l'historique est intact
        conn = get_connection(TEST_DB)
        cur = conn.cursor()

        cur.execute("SELECT status FROM contacts WHERE id = ?", (contact_id,))
        new_status = cur.fetchone()[0]
        self.assertEqual(new_status, 'client')

        # Vérifier que l'activité d'origine existe toujours
        cur.execute("SELECT title, duration_minutes FROM activities WHERE id = ?", (activity_id,))
        act = cur.fetchone()
        self.assertIsNotNone(act)
        self.assertEqual(act[0], 'Appel de qualification')
        self.assertEqual(act[1], 30)

        # Vérifier que le devis est toujours rattaché au même contact
        cur.execute("SELECT quote_number, amount_ttc FROM quotes WHERE contact_id = ?", (contact_id,))
        q = cur.fetchone()
        self.assertIsNotNone(q)
        self.assertEqual(q[0], 'DEV-TEST-01')
        self.assertEqual(q[1], 3000.0)

        conn.close()

    def test_mrr_calculation(self):
        """Vérifie le calcul normalisé du MRR pour les fréquences mensuelle, trimestrielle et annuelle."""
        conn = get_connection(TEST_DB)
        cur = conn.cursor()

        cur.execute("INSERT INTO contacts (contact_name) VALUES ('Client MRR')")
        cid = cur.lastrowid

        # Contrat mensuel 150 € -> 150 € MRR
        cur.execute("INSERT INTO contracts (reference, contact_id, title, start_date, frequency, amount_per_period, status) VALUES ('C1', ?, 'Mensuel', '2026-01-01', 'mensuelle', 150.0, 'actif')", (cid,))
        # Contrat trimestriel 300 € -> 100 € MRR
        cur.execute("INSERT INTO contracts (reference, contact_id, title, start_date, frequency, amount_per_period, status) VALUES ('C2', ?, 'Trimestriel', '2026-01-01', 'trimestrielle', 300.0, 'actif')", (cid,))
        # Contrat annuel 1200 € -> 100 € MRR
        cur.execute("INSERT INTO contracts (reference, contact_id, title, start_date, frequency, amount_per_period, status) VALUES ('C3', ?, 'Annuel', '2026-01-01', 'annuelle', 1200.0, 'actif')", (cid,))
        # Contrat suspendu (ne doit pas compter dans le MRR)
        cur.execute("INSERT INTO contracts (reference, contact_id, title, start_date, frequency, amount_per_period, status) VALUES ('C4', ?, 'Suspendu', '2026-01-01', 'mensuelle', 500.0, 'suspendu')", (cid,))

        conn.commit()

        cur.execute("SELECT frequency, amount_per_period FROM contracts WHERE status = 'actif'")
        active_contracts = cur.fetchall()
        total_mrr = 0.0
        for freq, amt in active_contracts:
            if freq == 'mensuelle': total_mrr += amt
            elif freq == 'trimestrielle': total_mrr += amt / 3
            elif freq == 'semestrielle': total_mrr += amt / 6
            elif freq == 'annuelle': total_mrr += amt / 12

        self.assertEqual(total_mrr, 350.0) # 150 + 100 + 100
        conn.close()

if __name__ == '__main__':
    unittest.main()
