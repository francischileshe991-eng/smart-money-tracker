import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase, supabaseConfigured } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    let initialized = false;
    const handledCodes = new Set<string>();
    async function handleCode(code: unknown) {
      if (typeof code !== 'string' || handledCodes.has(code)) return;
      handledCodes.add(code);
      const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);
      if (exchangeError && mounted) setError(exchangeError.message);
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (initialized) setLoading(false);
    });
    const urlListener = Linking.addEventListener('url', ({ url }) => {
      void handleCode(Linking.parse(url).queryParams?.code);
    });
    void (async () => {
      try {
        const initial = await Linking.parseInitialURLAsync();
        await handleCode(initial.queryParams?.code);
        const { data, error: sessionError } = await supabase!.auth.getSession();
        if (!mounted) return;
        if (sessionError) setError(sessionError.message);
        setSession(data.session);
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Could not restore your session.');
      } finally {
        initialized = true;
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      urlListener.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    configured: supabaseConfigured,
    error,
    clearError: () => setError(null),
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key.');
      const { error: result } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result) throw result;
    },
    signUp: async (email, password, name) => {
      if (!supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key.');
      const { error: result } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: Linking.createURL('/auth') },
      });
      if (result) throw result;
    },
    signOut: async () => {
      if (!supabase) return;
      const { error: result } = await supabase.auth.signOut();
      if (result) throw result;
    },
    resetPassword: async (email) => {
      if (!supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key.');
      const { error: result } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: Linking.createURL('/reset-password'),
      });
      if (result) throw result;
    },
    updateName: async (name) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error: result } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      if (result) throw result;
      const { error: profileError } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', session?.user.id);
      if (profileError) throw profileError;
    },
    updatePassword: async (password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error: result } = await supabase.auth.updateUser({ password });
      if (result) throw result;
    },
  }), [session, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
