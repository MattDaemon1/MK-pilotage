# Matt Konnect CRM — Pilotage d'activité complet

Application CRM locale en Python avec Streamlit et SQLite pour gérer l'ensemble de l'activité professionnelle **Matt Konnect** (prospection, réunions, missions web, maintenance WordPress, hébergement, devis, factures, encaissements et suivi du temps).

---

## 1. Fonctionnalités clés

1. **Bouton omniprésent « Consigner mon travail » (< 1 min)** :
   - Enregistrement immédiat de toute action (appel, bug fix, màj WordPress, cadrage, audit).
   - Raccourci clavier `N`.
   - Boutons de pré-remplissage rapide du temps passé (15m, 30m, 45m, 1h, 1h30, 2h, 3h).
   - Rattachement automatique ou optionnel au client et à la mission.

2. **Contacts, Entreprises & Conversion Prospect ➔ Client** :
   - Fiches unifiées avec statuts : *Prospect*, *Client*, *Partenaire*, *Client inactif*.
   - Conversion manuelle 1-clic d'un prospect en client sans doublon ni perte d'historique (tous les devis, missions, activités et tâches sont conservés).

3. **Fiche client centralisée (Hub 8 onglets)** :
   - 1. Vue d'ensemble (indicateurs clés, solde dû, dernière interaction).
   - 2. Historique chronologique complet des activités.
   - 3. Missions et projets rattachés.
   - 4. Contrats récurrents.
   - 5. Devis et factures.
   - 6. Temps passé.
   - 7. Tâches et prochaines échéances.
   - 8. Notes et coordonnées complètes.

4. **Missions & Projets** :
   - Cadrage, devis envoyé, en cours, livrée, clôturée.
   - Suivi budgétaire : montant estimé, accepté, facturé et encaissé.
   - Suivi du temps : budget temps prévu vs heures réelles passées.

5. **Contrats récurrents & Revenu MRR** :
   - Suivi des contrats de maintenance et hébergement.
   - Calcul normalisé automatique du **MRR (Monthly Recurring Revenue)** pour les fréquences mensuelle, trimestrielle, semestrielle et annuelle.
   - Alertes des renouvellements à échéance (< 30 jours).

6. **Devis, Factures & Encaissements** :
   - Séparation stricte entre CA signé (devis), CA facturé (émis TTC) et montants réellement encaissés sur le compte bancaire.
   - Enregistrement de paiements multiples pour une même facture.
   - Suivi des retards de paiement.

7. **Tâches & Relances (5 vues prioritaires)** :
   - *Aujourd'hui*, *En retard*, *Cette semaine*, *À venir*, *Terminées*.

8. **Recherche globale transversale** :
   - Recherche instantanée par mot-clé sur les entreprises, contacts, missions, contrats, devis, factures et tâches.

9. **Sauvegardes & Restauration** :
   - Téléchargement du fichier binaire SQLite brut (`.sqlite`).
   - Sauvegarde complète au format JSON.
   - Restauration avec validation d'intégrité relationnelle.
   - Exports CSV individuels par entité (Excel / LibreOffice).

---

## 2. Installation et lancement en local (Windows, macOS, Linux)

La base de données SQLite est persistée dans le fichier **`data/matt_konnect.sqlite`** et partagée entre l'application Web React et l'application Python.

### Option A — Application Web Full-Stack React + Node (Recommandée)

Cette version offre l'interface complète moderne avec toutes les fonctionnalités (hub client 8 onglets, raccourci `N`, suivi du temps, devis/factures, double sauvegarde SQLite + navigateur).

```bash
# 1. Se positionner dans le dossier du projet
cd MattKonnectCRM

# 2. Installer les dépendances Node.js (Node 18+)
npm install

# 3. Lancer le serveur local (backend Express + frontend Vite)
npm run dev
```

L'application s'ouvre automatiquement sur : **`http://localhost:3000`**

- **Identifiants configurés** :
  - **Identifiant** : `Matt`
  - **Mot de passe** : `Maboule35!`
- **Persistance** : Les données sont enregistrées en temps réel dans `data/matt_konnect.sqlite` et sauvegardées dans le cache sécurisé du navigateur (`localStorage`).

---

### Option B — Application Python Streamlit

Si vous préférez exécuter l'application Python locale :

```bash
# 1. Créer et activer l'environnement virtuel
python -m venv venv

# Sous Windows (PowerShell) :
.\venv\Scripts\Activate.ps1
# Ou sous Windows (CMD) :
venv\Scripts\activate.bat
# Ou sous macOS / Linux :
source venv/bin/activate

# 2. Installer les dépendances Python
pip install -r requirements.txt

# 3. Lancer Streamlit
streamlit run python_app/app.py
```

L'application Python s'ouvre sur : **`http://localhost:8501`** (connectée à la même base `data/matt_konnect.sqlite`).

---

## 3. Architecture du projet

```
├── data/
│   └── matt_konnect.sqlite     # Base SQLite locale persistante
├── python_app/
│   ├── app.py                  # Interface Streamlit complète en Python
│   └── database.py             # Schéma SQLite, relations et triggers
├── server/
│   └── db.ts                   # Moteur SQLite WASM avec persistance disque
├── src/
│   ├── components/             # Composants UI (Sidebar, TopBar, QuickLogModal)
│   ├── views/                  # Vues modulaires (Dashboard, Contacts, Detail, etc.)
│   ├── services/api.ts         # Service de communication avec l'API SQLite
│   └── types/crm.ts            # Modèles de données TypeScript
├── tests/
│   └── test_crm.py             # Tests unitaires automatisés
├── server.ts                   # Serveur Express full-stack avec Vite middleware
├── requirements.txt            # Dépendances Python (streamlit, pandas)
└── README.md
```

---

## 4. Exécution des tests de validation

Pour exécuter la suite de tests unitaires :

```bash
python -m unittest tests/test_crm.py
```

Tests inclus :
- Vérification de la création d'un prospect, d'une activité et d'un devis.
- Vérification de la conversion en Client sans aucune perte de données ni doublon.
- Vérification du calcul normalisé du MRR mensuel, trimestriel et annuel.
