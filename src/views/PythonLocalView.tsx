import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, Monitor, Code2, ShieldAlert } from 'lucide-react';

export const PythonLocalView: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const windowsCommands = `# 1. Cloner ou placer les fichiers dans un dossier (ex: C:\\MattKonnectCRM)
cd C:\\MattKonnectCRM

# 2. Créer l'environnement virtuel Python
python -m venv venv

# 3. Activer l'environnement virtuel sous Windows (PowerShell / Invite de commandes)
# Sous PowerShell :
.\\venv\\Scripts\\Activate.ps1
# Ou sous CMD :
venv\\Scripts\\activate.bat

# 4. Installer les dépendances
pip install -r requirements.txt

# 5. Lancer l'application Streamlit locale
streamlit run app.py
`;

  const requirementsTxt = `streamlit>=1.35.0
pandas>=2.1.0
`;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-600" />
          Code Python & Déploiement Local sous Windows
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Instructions complètes et fichiers Python Streamlit + SQLite prêts à l'emploi en local
        </p>
      </div>

      {/* Guide Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Guide de démarrage rapide sous Windows 10 / 11
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Cette application peut fonctionner de deux manières complémentaires : directement dans cette interface web réactive (propulsée par Node/React et SQLite persistant), ou en local sur votre PC Windows avec Python 3, Streamlit et la même base SQLite.
        </p>

        {/* Windows Commands Box */}
        <div className="relative bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
          <button
            onClick={() => copyToClipboard(windowsCommands, 'cmd')}
            className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1.5 transition-colors"
          >
            {copiedSection === 'cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'cmd' ? 'Copié !' : 'Copier les commandes'}</span>
          </button>
          <pre>{windowsCommands}</pre>
        </div>
      </div>

      {/* File Structure & Python files */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* requirements.txt */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900 font-mono">requirements.txt</h3>
            <button
              onClick={() => copyToClipboard(requirementsTxt, 'req')}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
            >
              {copiedSection === 'req' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'req' ? 'Copié' : 'Copier'}</span>
            </button>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-800 border border-slate-200">
            <pre>{requirementsTxt}</pre>
          </div>
        </div>

        {/* SQLite database location */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-900">Emplacement de la base SQLite</h3>
          <p className="text-xs text-slate-600">
            Le fichier de base de données est nommé <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">matt_konnect.sqlite</code> (ou <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">crm_matt_konnect.db</code>).
          </p>
          <div className="pt-2">
            <a
              href="/api/backup/sqlite"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le fichier SQLite actif</span>
            </a>
          </div>
        </div>
      </div>

      {/* Architecture notes */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2 text-xs text-slate-700">
        <h3 className="font-semibold text-slate-900">Architecture & Garantie de persistance :</h3>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Création automatique des tables et contraintes au premier démarrage si la base n'existe pas.</li>
          <li>Conversion des prospects en clients sans perte des devis, factures ou interventions antérieures.</li>
          <li>Séparation stricte du CA signé (devis), CA facturé et montants réellement encaissés sur compte bancaire.</li>
          <li>Calcul normalisé du MRR pour les abonnements de maintenance mensuels, trimestriels ou annuels.</li>
        </ul>
      </div>
    </div>
  );
};
