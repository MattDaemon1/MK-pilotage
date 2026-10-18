"""
Matt Konnect CRM - Application Locale Streamlit & SQLite
Conçue spécialement pour les indépendants et petites entreprises.
"""

import streamlit as st
import pandas as pd
import sqlite3
import os
import datetime
from database import init_db, get_connection, convert_prospect_to_client, DB_FILENAME

st.set_page_config(
    page_title="Matt Konnect CRM",
    page_icon="💼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialisation de la base SQLite locale
init_db(DB_FILENAME)

def format_euro(val):
    if val is None or pd.isna(val):
        return "0,00 €"
    return f"{val:,.2f} €".replace(",", " ").replace(".", ",").replace(" ", " ")

def get_df(query, params=()):
    conn = get_connection(DB_FILENAME)
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return df

def execute_query(query, params=()):
    conn = get_connection(DB_FILENAME)
    cursor = conn.cursor()
    cursor.execute(query, params)
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Barre latérale de navigation
# -------------------------------------------------------------
st.sidebar.title("Matt Konnect CRM")
st.sidebar.caption("Pilotage complet d'activité · Base locale SQLite")

menu = st.sidebar.radio(
    "Navigation",
    [
        "📊 1. Tableau de bord",
        "👥 2. Contacts et clients",
        "⚡ 3. Consigner mon travail",
        "📖 4. Journal de travail",
        "🚀 5. Missions et projets",
        "🔄 6. Contrats récurrents & MRR",
        "💶 7. Devis et factures",
        "✅ 8. Tâches et relances",
        "🔍 9. Recherche globale",
        "💾 10. Paramètres & Sauvegardes"
    ]
)

st.sidebar.divider()
st.sidebar.caption("Stockage : `matt_konnect.sqlite`")
st.sidebar.caption("Mode : Monoposte local Windows")

# -------------------------------------------------------------
# 1. Tableau de bord
# -------------------------------------------------------------
if menu == "📊 1. Tableau de bord":
    st.header("Tableau de bord de pilotage")
    st.write("Vue synthétique en temps réel de votre activité professionnelle.")

    contacts_df = get_df("SELECT * FROM contacts WHERE is_archived = 0")
    missions_df = get_df("SELECT * FROM missions WHERE is_archived = 0")
    contracts_df = get_df("SELECT * FROM contracts WHERE status = 'actif'")
    quotes_df = get_df("SELECT * FROM quotes")
    invoices_df = get_df("SELECT * FROM invoices")
    payments_df = get_df("SELECT * FROM payments")
    tasks_df = get_df("SELECT * FROM tasks WHERE status != 'terminée'")

    # Indicateurs portefeuille
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        prospects_cnt = len(contacts_df[contacts_df['status'] == 'prospect'])
        clients_cnt = len(contacts_df[contacts_df['status'] == 'client'])
        st.metric("Clients actifs", clients_cnt, f"+ {prospects_cnt} prospects")

    with col2:
        active_missions = len(missions_df[~missions_df['status'].isin(['clôturée', 'annulée'])])
        st.metric("Missions en cours", active_missions)

    with col3:
        # Calcul MRR normalisé
        mrr = 0.0
        for _, row in contracts_df.iterrows():
            freq = row['frequency']
            amt = float(row['amount_per_period'] or 0)
            if freq == 'mensuelle': mrr += amt
            elif freq == 'trimestrielle': mrr += amt / 3
            elif freq == 'semestrielle': mrr += amt / 6
            elif freq == 'annuelle': mrr += amt / 12
        st.metric("Revenu Récurrent (MRR)", format_euro(mrr))

    with col4:
        today_str = datetime.date.today().isoformat()
        overdue_tasks = len(tasks_df[tasks_df['due_date'] < today_str])
        st.metric("Tâches en retard", overdue_tasks)

    st.divider()

    # Indicateurs financiers stricts
    st.subheader("Pilotage financier réel")
    st.caption("Distinction stricte entre devis signés, factures émises et montants encaissés")

    fcol1, fcol2, fcol3, fcol4 = st.columns(4)
    with fcol1:
        signed = quotes_df[quotes_df['status'] == 'accepté']['amount_ttc'].sum()
        st.metric("CA Signé (Devis)", format_euro(signed))
    with fcol2:
        invoiced = invoices_df['amount_ttc'].sum()
        st.metric("CA Facturé (Émis)", format_euro(invoiced))
    with fcol3:
        collected = payments_df['amount'].sum()
        st.metric("Encaissé réel", format_euro(collected))
    with fcol4:
        remaining = max(0.0, invoiced - collected)
        st.metric("Reste à encaisser", format_euro(remaining))

# -------------------------------------------------------------
# 2. Contacts et clients
# -------------------------------------------------------------
elif menu == "👥 2. Contacts et clients":
    st.header("Contacts & Entreprises")

    with st.expander("➕ Créer une nouvelle fiche contact / entreprise", expanded=False):
        with st.form("new_contact_form"):
            c1, c2 = st.columns(2)
            with c1:
                c_name = st.text_input("Nom & prénom du contact *")
                comp_name = st.text_input("Nom de l'entreprise")
                role_t = st.text_input("Fonction")
                status = st.selectbox("Statut initial", ["prospect", "client", "partenaire", "client_inactif"])
                source = st.selectbox("Origine", ["prospection", "recommandation", "site web", "réseau", "autre"])
            with c2:
                email = st.text_input("Email")
                phone = st.text_input("Téléphone")
                website = st.text_input("Site Web")
                city = st.text_input("Ville")
                next_act = st.text_input("Prochaine action / relance")

            notes = st.text_area("Notes générales")
            submitted = st.form_submit_button("Enregistrer le contact")
            if submitted and c_name:
                execute_query("""
                    INSERT INTO contacts (contact_name, company_name, role_title, status, lead_source, email, phone, website, city, next_action, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (c_name, comp_name, role_t, status, source, email, phone, website, city, next_act, notes))
                st.success("Contact créé avec succès !")
                st.rerun()

    contacts = get_df("SELECT id, contact_name, company_name, status, email, phone, city, next_action, follow_up_date FROM contacts WHERE is_archived = 0 ORDER BY contact_name ASC")

    st.subheader(f"Liste des contacts ({len(contacts)})")
    for _, row in contacts.iterrows():
        with st.container():
            c1, c2, c3, c4 = st.columns([3, 2, 2, 2])
            with c1:
                st.markdown(f"**{row['contact_name']}** {f'· {row[\"company_name\"]}' if row['company_name'] else ''}")
                st.caption(f"{row['email'] or ''} {f'· {row[\"phone\"]}' if row['phone'] else ''}")
            with c2:
                st.write(f"Statut : **{row['status'].upper()}**")
            with c3:
                st.write(f"Action : {row['next_action'] or '—'}")
            with c4:
                if row['status'] == 'prospect':
                    if st.button("Convertir en Client", key=f"conv_{row['id']}"):
                        convert_prospect_to_client(row['id'])
                        st.success(f"{row['contact_name']} est maintenant Client !")
                        st.rerun()
            st.divider()

# -------------------------------------------------------------
# 3. Consigner mon travail (Fonctionnalité prioritaire en < 1 min)
# -------------------------------------------------------------
elif menu == "⚡ 3. Consigner mon travail":
    st.header("⚡ Consigner mon travail")
    st.caption("Enregistrement rapide en moins d'une minute d'un appel, développement, bug fix ou conseil.")

    contacts = get_df("SELECT id, contact_name, company_name FROM contacts WHERE is_archived = 0")
    missions = get_df("SELECT id, reference, title, contact_id FROM missions WHERE is_archived = 0")

    contact_options = {"— Action interne (sans client) —": None}
    for _, c in contacts.iterrows():
        label = f"{c['company_name']} ({c['contact_name']})" if c['company_name'] else c['contact_name']
        contact_options[label] = c['id']

    with st.form("quick_log_form"):
        title = st.text_input("Ce que vous venez de faire *", placeholder="Ex: Correction bug CSS formulaire checkout, mise à jour WordPress ACF Pro...")

        c1, c2 = st.columns(2)
        with c1:
            category = st.selectbox(
                "Catégorie",
                [
                    "Développement", "Maintenance", "Correction bug", "Mise à jour WordPress",
                    "Audit de site", "Appel", "Email", "Rendez-vous", "Réunion de cadrage",
                    "Prospection", "Conseil", "Formation", "Administration", "Autre"
                ]
            )
            duration = st.slider("Temps passé (minutes)", min_value=5, max_value=240, value=30, step=5)

        with c2:
            selected_contact_label = st.selectbox("Client associé", list(contact_options.keys()))
            selected_cid = contact_options[selected_contact_label]

            # Missions filtrées pour ce client
            mission_options = {"— Hors mission —": None}
            if selected_cid:
                client_missions = missions[missions['contact_id'] == selected_cid]
                for _, m in client_missions.iterrows():
                    mission_options[f"{m['reference']} · {m['title']}"] = m['id']
            selected_mission_label = st.selectbox("Mission associée", list(mission_options.keys()))
            selected_mid = mission_options[selected_mission_label]

        details = st.text_area("Compte rendu / Précisions techniques (optionnel)")
        next_act = st.text_input("Prochaine action éventuelle (optionnel)")

        submitted = st.form_submit_button("⚡ Enregistrer mon travail")
        if submitted and title:
            today_str = datetime.date.today().isoformat()
            now_time = datetime.datetime.now().strftime("%H:%M")
            execute_query("""
                INSERT INTO activities (title, description, activity_date, activity_time, category, duration_minutes, contact_id, mission_id, next_action, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'réalisé')
            """, (title, details, today_str, now_time, category, duration, selected_cid, selected_mid, next_act))
            st.success(f"Travail consigné avec succès ({duration} min) !")

# -------------------------------------------------------------
# 4. Journal de travail
# -------------------------------------------------------------
elif menu == "📖 4. Journal de travail":
    st.header("Journal de travail complet")
    st.caption("Consultez et filtrez toutes vos actions réalisées.")

    activities = get_df("""
        SELECT a.id, a.activity_date, a.activity_time, a.title, a.category, a.duration_minutes,
               c.contact_name, c.company_name, m.title as mission_title
        FROM activities a
        LEFT JOIN contacts c ON c.id = a.contact_id
        LEFT JOIN missions m ON m.id = a.mission_id
        ORDER BY a.activity_date DESC, a.activity_time DESC
    """)

    st.dataframe(activities, use_container_width=True)

# -------------------------------------------------------------
# 5. Missions et projets
# -------------------------------------------------------------
elif menu == "🚀 5. Missions et projets":
    st.header("Missions & Projets")
    missions = get_df("""
        SELECT m.reference, m.title, c.contact_name, c.company_name, m.service_category,
               m.status, m.accepted_amount, m.time_budget_hours
        FROM missions m
        JOIN contacts c ON c.id = m.contact_id
        WHERE m.is_archived = 0
        ORDER BY m.created_at DESC
    """)
    st.dataframe(missions, use_container_width=True)

# -------------------------------------------------------------
# 6. Contrats récurrents & MRR
# -------------------------------------------------------------
elif menu == "🔄 6. Contrats récurrents & MRR":
    st.header("Contrats récurrents & Revenu MRR")
    contracts = get_df("""
        SELECT ctr.reference, ctr.title, c.contact_name, c.company_name,
               ctr.frequency, ctr.amount_per_period, ctr.status, ctr.next_renewal_date
        FROM contracts ctr
        JOIN contacts c ON c.id = ctr.contact_id
    """)
    st.dataframe(contracts, use_container_width=True)

# -------------------------------------------------------------
# 7. Devis et factures
# -------------------------------------------------------------
elif menu == "💶 7. Devis et factures":
    st.header("Devis & Factures")
    tab1, tab2 = st.tabs(["Factures", "Devis"])
    with tab1:
        invoices = get_df("""
            SELECT i.invoice_number, c.contact_name, c.company_name,
                   i.issue_date, i.due_date, i.amount_ttc, i.payment_status
            FROM invoices i
            JOIN contacts c ON c.id = i.contact_id
            ORDER BY i.issue_date DESC
        """)
        st.dataframe(invoices, use_container_width=True)
    with tab2:
        quotes = get_df("""
            SELECT q.quote_number, c.contact_name, c.company_name,
                   q.issue_date, q.amount_ttc, q.status
            FROM quotes q
            JOIN contacts c ON c.id = q.contact_id
            ORDER BY q.issue_date DESC
        """)
        st.dataframe(quotes, use_container_width=True)

# -------------------------------------------------------------
# 8. Tâches et relances
# -------------------------------------------------------------
elif menu == "✅ 8. Tâches et relances":
    st.header("Tâches & Relances")
    tasks = get_df("""
        SELECT t.id, t.title, c.contact_name, t.due_date, t.priority, t.status
        FROM tasks t
        LEFT JOIN contacts c ON c.id = t.contact_id
        ORDER BY t.due_date ASC
    """)
    st.dataframe(tasks, use_container_width=True)

# -------------------------------------------------------------
# 9. Recherche globale
# -------------------------------------------------------------
elif menu == "🔍 9. Recherche globale":
    st.header("Recherche transversale")
    query = st.text_input("Rechercher dans toute la base (contact, mission, mot-clé)")
    if query:
        term = f"%{query}%"
        results = get_df("""
            SELECT 'Contact' as Entite, contact_name || ' (' || COALESCE(company_name, '') || ')' as Libelle, status as Details FROM contacts WHERE contact_name LIKE ? OR company_name LIKE ?
            UNION ALL
            SELECT 'Mission', reference || ' · ' || title, status FROM missions WHERE reference LIKE ? OR title LIKE ?
            UNION ALL
            SELECT 'Activité', title, category FROM activities WHERE title LIKE ? OR description LIKE ?
        """, (term, term, term, term, term, term))
        st.dataframe(results, use_container_width=True)

# -------------------------------------------------------------
# 10. Paramètres & Sauvegardes
# -------------------------------------------------------------
elif menu == "💾 10. Paramètres & Sauvegardes":
    st.header("Sauvegardes et Exports")
    st.write("Protection et export de vos données professionnelles.")

    if os.path.exists(DB_FILENAME):
        with open(DB_FILENAME, "rb") as f:
            st.download_button(
                label="📥 Télécharger la base SQLite (matt_konnect.sqlite)",
                data=f,
                file_name="matt_konnect_backup.sqlite",
                mime="application/x-sqlite3"
            )
