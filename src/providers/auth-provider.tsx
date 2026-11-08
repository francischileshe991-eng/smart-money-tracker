import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { parseAuthCallback, scrubAuthCallbackUrl } from '@/utils/auth-callback';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  passwordRecovery: boolean;
  finishPasswordRecovery: () => void;
  deleteAccount: (password: string, clearDeviceData: () => Promise<void>) => Promise<void>;
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
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    let initialized = false;
    const handled = new Set<string>();
    const pending = new Set<string>();
    const destinations = [Linking.createURL('/auth'), Linking.createURL('/reset-password'),
      'smartmoneytracker://auth', 'smartmoneytracker://reset-password',
      'smartmoneytracker:///auth', 'smartmoneytracker:///reset-password'];
    async function handleUrl(url: string | null) {
      const callback = parseAuthCallback(url, destinations);
      if (callback.type === 'none') return;
      if (callback.type === 'error') {
        if (mounted) setError(callback.message);
        return;
      }
      const key = callback.type === 'code' ? callback.code : callback.accessToken;
      if (handled.has(key) || pending.has(key)) return;
      pending.add(key);
      if (callback.recovery && mounted) setPasswordRecovery(true);
      try {
        const result = callback.type === 'code'
          ? await supabase!.auth.exchangeCodeForSession(callback.code)
          : await supabase!.auth.setSession({ access_token: callback.accessToken, refresh_token: callback.refreshToken });
        if (result.error) throw result.error;
        handled.add(key);
        if (typeof window !== 'undefined' && window.location?.href === url) {
          window.history.replaceState(null, '', scrubAuthCallbackUrl(url));
        }
        if (mounted) setError(null);
      } catch {
        if (mounted) {
          setPasswordRecovery(false);
          setError('This sign-in link is invalid or expired. Request a new link and try again.');
        }
      } finally { pending.delete(key); }
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      if (_event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (_event === 'SIGNED_OUT') setPasswordRecovery(false);
      setSession(nextSession);
      if (initialized) setLoading(false);
    });
    const urlListener = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });
    void (async () => {
      try {
        await handleUrl(await Linking.getInitialURL());
        const { data, error: sessionError } = await supabase!.auth.getSession();
        if (!mounted) return;
        if (sessionError) setError('Could not restore your session. Please sign in again.');
        setSession(data.session);
      } catch {
        if (mounted) setError('Could not restore your session. Please sign in again.');
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
    passwordRecovery,
    finishPasswordRecovery: () => setPasswordRecovery(false),
    deleteAccount: async (password, clearDeviceData) => {
      if (!supabase || !session) throw new Error('Sign in before deleting your account.');
      const { data, error: deletionError } = await supabase.functions.invoke('delete-account', {
        body: { password, confirmation: 'DELETE' },
      });
      if (deletionError || data?.deleted !== true) {
        let message = 'Could not delete your account. Please try again when online.';
        if (deletionError?.context instanceof Response) {
          const details = await deletionError.context.json().catch(() => null);
          if (typeof details?.error === 'string') message = details.error;
        }
        throw new Error(message);
      }
      try { await clearDeviceData(); }
      finally {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setPasswordRecovery(false);
      }
    },
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
  }), [session, loading, error, passwordRecovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
