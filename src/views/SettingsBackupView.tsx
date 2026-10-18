import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  Building,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api.ts';

export const SettingsBackupView: React.FC = () => {
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

  const handleDownloadSqlite = () => {
    window.location.href = '/api/backup/sqlite';
  };

  const handleDownloadJson = () => {
    window.location.href = '/api/backup/json';
  };

  const handleDownloadCsv = (table: string) => {
    window.location.href = `/api/backup/csv/${table}`;
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingRestoreFile(file);
    e.target.value = '';
  };

  const executeRestore = () => {
    if (!pendingRestoreFile) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await api.restoreBackup(json);
        setRestoreMessage(res.message);
        setRestoreError(null);
        setPendingRestoreFile(null);
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        setRestoreError(err.message || 'Fichier JSON invalide.');
        setRestoreMessage(null);
        setPendingRestoreFile(null);
      }
    };
    reader.readAsText(pendingRestoreFile);
  };

  const executeResetDemo = async () => {
    setShowResetConfirm(false);
    try {
      const res = await api.resetDemo();
      setResetMessage(res.message);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setRestoreError(err.message || 'Erreur lors de la réinitialisation');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Sauvegardes, Exports & Paramètres
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestion de la base locale SQLite, exports comptables CSV et sécurité de vos données
        </p>
      </div>

      {restoreMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{restoreMessage} (Rechargement de l'application en cours...)</span>
        </div>
      )}

      {restoreError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{restoreError}</span>
        </div>
      )}

      {resetMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{resetMessage} (Rechargement...)</span>
        </div>
      )}

      {/* Grid: 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Sauvegarde complète SQLite & JSON */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Database className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Sauvegarde intégrale SQLite
              </h2>
              <p className="text-[11px] text-slate-500">
                Fichier binaire réel utilisable directement avec SQLite ou l'application Python Streamlit
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Téléchargez à tout moment une copie exacte de votre base SQLite ou une archive JSON lisible par tout système.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleDownloadSqlite}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger base SQLite (.sqlite)</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Sauvegarde JSON (.json)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Restauration de données */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Upload className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Restauration d'une sauvegarde
              </h2>
              <p className="text-[11px] text-slate-500">
                Restauration sécurisée avec contrôle d'intégrité relationnel
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Sélectionnez un fichier JSON préalablement exporté pour restaurer immédiatement l'ensemble de vos contacts, missions, contrats, devis et activités.
          </p>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer shadow-xs transition-colors">
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Choisir un fichier de sauvegarde JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelected}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Exports CSV par Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Exports CSV table par table (Excel / Tableurs)
            </h2>
            <p className="text-[11px] text-slate-500">
              Téléchargement direct au format CSV standard avec encodage UTF-8
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            { id: 'contacts', label: 'Contacts & Clients' },
            { id: 'activities', label: 'Journal de travail' },
            { id: 'missions', label: 'Missions & Projets' },
            { id: 'contracts', label: 'Contrats récurrents' },
            { id: 'quotes', label: 'Devis' },
            { id: 'invoices', label: 'Factures' },
            { id: 'payments', label: 'Règlements reçus' },
            { id: 'tasks', label: 'Tâches & Relances' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleDownloadCsv(t.id)}
              className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition-colors flex items-center justify-between"
            >
              <span className="text-xs font-medium text-slate-800">{t.label}</span>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Card 3: Réinitialisation & Démonstration */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <RotateCcw className="w-5 h-5 text-amber-600" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Jeu de données de test Matt Konnect
            </h2>
            <p className="text-[11px] text-slate-500">
              Réinitialise la base locale avec les exemples complets (prospects, clients, refonte web, contrats maintenance)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
        >
          Recharger les données d'exemple Matt Konnect
        </button>
      </div>

      {/* Modal: Confirm Restore */}
      {pendingRestoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirmer la restauration</h3>
                <p className="text-slate-500 text-[11px]">{pendingRestoreFile.name}</p>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Attention : Cette action va remplacer l'ensemble des données actuelles par celles contenues dans ce fichier de sauvegarde.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingRestoreFile(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeRestore}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
              >
                Confirmer la restauration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset Demo */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Réinitialiser avec les données d'exemple ?</h3>
                <p className="text-slate-500 text-[11px]">Base locale SQLite</p>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Voulez-vous recharger le jeu de données d'exemple Matt Konnect ? Les modifications non exportées seront écrasées.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeResetDemo}
                className="px-4 py-1.5 bg-amber-600 text-white rounded font-medium hover:bg-amber-700"
              >
                Confirmer le rechargement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
