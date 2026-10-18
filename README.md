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

## 2. Installation et lancement sous Windows

### Prérequis
- Windows 10 ou Windows 11.
- Python 3.10 ou supérieur installé (cocher *"Add Python to PATH"* lors de l'installation).

### Commandes d'installation rapide

Ouvrez un terminal **PowerShell** ou une **Invite de commandes (CMD)** dans le dossier de l'application :

```powershell
# 1. Se positionner dans le dossier du projet
cd C:\MattKonnectCRM

# 2. Créer l'environnement virtuel Python
python -m venv venv

# 3. Activer l'environnement virtuel sous Windows
# Sous PowerShell :
.\venv\Scripts\Activate.ps1
# Ou sous CMD classique :
venv\Scripts\activate.bat

# 4. Installer les dépendances
pip install -r requirements.txt

# 5. Lancer l'application Streamlit
streamlit run python_app/app.py
```

L'application s'ouvrira automatiquement dans votre navigateur par défaut à l'adresse locale `http://localhost:8501`.

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
