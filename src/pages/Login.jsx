import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  LogIn, 
  Lock, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('jules43700@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Si déjà connecté, go database
  if (user) return <Navigate to="/database" replace />;

  const handleAuth = async (isSignup = false) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = isSignup 
        ? await signUp(email, password) 
        : await signIn(email, password);

      if (authError) throw authError;

      if (isSignup) {
        setSuccess(true);
      } else {
        navigate('/database');
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col justify-center relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary-500/10 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />

      <div className="w-full max-w-md mx-auto px-6 relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex p-4 bg-primary-500/10 rounded-3xl mb-6 shadow-2xl shadow-primary-500/20 border border-primary-500/20">
            <Layers className="w-10 h-10 text-primary-400" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">MonCRM</h1>
          <p className="text-surface-400 mt-2 text-sm font-medium">Votre plateforme de prospection privée</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-10 border-surface-800/40 shadow-2xl animate-slide-up">
          {success ? (
            <div className="text-center space-y-6 animate-scale-in py-4">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Compte Créé !</h3>
                <p className="text-surface-400 text-sm">Vérifiez vos emails {email} pour confirmer votre compte.</p>
              </div>
              <button onClick={() => setSuccess(false)} className="btn-primary w-full py-3.5 text-sm font-bold tracking-wide">
                Retour à la connexion
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-semibold animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest px-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600 group-focus-within:text-primary-400 transition-colors" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full bg-surface-950 border border-surface-800 focus:border-primary-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-surface-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest px-1">Mot de passe</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600 group-focus-within:text-primary-400 transition-colors" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-950 border border-surface-800 focus:border-primary-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-surface-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => handleAuth(false)}
                  disabled={loading}
                  className="btn-primary py-4 px-8 text-sm font-bold flex items-center justify-center gap-3 shadow-2xl shadow-primary-500/20 hover:scale-[1.02] active:scale-95 transition-all w-full"
                >
                  {loading ? 'Connexion...' : 'Se Connecter'}
                  <LogIn className="w-4 h-4" />
                </button>

                <button 
                   onClick={() => handleAuth(true)}
                   disabled={loading}
                   className="text-[11px] text-surface-500 hover:text-primary-400 transition-colors py-2 font-bold uppercase tracking-widest flex items-center justify-center gap-2 group"
                >
                  Pas encore de compte ? 
                  <span className="text-white group-hover:text-primary-300">S'inscrire</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center mt-10 text-[10px] text-surface-600 uppercase font-bold tracking-[0.2em]">
          &copy; 2026 Developed with ❤️ by Antigravity
        </p>
      </div>
    </div>
  );
}
