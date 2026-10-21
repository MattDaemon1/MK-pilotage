import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../services/api.ts';

interface LoginViewProps {
  onLoginSuccess: (user: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  // Fields must start strictly empty as requested by user
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }

    setLoading(true);
    try {
      // Validate credentials against API (with local fallback)
      await api.login(cleanUser, password);
      // Persist auth token/user in localStorage
      localStorage.setItem('mk_auth_user', 'Matt');
      onLoginSuccess('Matt');
    } catch (err: any) {
      setError(err.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-8 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand identity header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-500/20">
            MK
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Matt Konnect CRM
          </h1>
          <p className="text-xs text-slate-400">
            Pilotage d&apos;activité & CRM Solo · Espace sécurisé
          </p>
        </div>

        {/* Login card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-base font-semibold text-white">Connexion</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifiez-vous pour accéder à vos dossiers, clients et devis
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Identifiant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Votre identifiant"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Votre mot de passe"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Connexion en cours...</span>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Session locale sécurisée</span>
            </span>
            <span className="font-mono text-slate-400">MK-Solo</span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Matt Konnect CRM · Base locale SQLite persistante
        </p>
      </div>
    </div>
  );
};
