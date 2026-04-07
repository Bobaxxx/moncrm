import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sécurité : Vérification immédiate de la config
  const hasConfig = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!hasConfig) {
      setLoading(false);
      return;
    }

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Supabase init error:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, [hasConfig]);

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  const signOut = () => supabase.auth.signOut();

  if (!hasConfig) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4">
             <h3 className="text-red-400 font-bold tracking-tight">Configuration Manquante ! 🚨</h3>
          </div>
          <p className="text-surface-500 text-sm max-w-xs font-medium">
              Les clés Supabase ne sont pas détectées.<br/><br/>
              <b>Veuillez couper (Ctrl+C) et relancer ton terminal avec :</b><br/>
              <code className="bg-surface-900 border border-surface-800 px-2 py-1 rounded text-primary-400 mt-2 inline-block">npm run dev</code>
          </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {loading ? (
        <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
            <p className="text-surface-700 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Initialisation du CRM</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};




export const useAuth = () => useContext(AuthContext);
