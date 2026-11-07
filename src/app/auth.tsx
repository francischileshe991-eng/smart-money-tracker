import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword, configured, error: authError, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const title = mode === 'register' ? 'Create account' : mode === 'recovery' ? 'Reset password' : 'Welcome back';

  async function submit() {
    setError(''); setMessage(''); clearError(); setBusy(true);
    try {
      if (!email.includes('@')) throw new Error('Enter a valid email address.');
      if (mode === 'recovery') {
        await resetPassword(email);
        setMessage('If an account exists for this email, a password reset link is on its way.');
      } else if (mode === 'register') {
        if (name.trim().length < 2) throw new Error('Enter your name.');
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        await signUp(email, password, name);
        setMessage('Account created. Check your email to confirm your address, then sign in.');
        setMode('login');
      } else {
        await signIn(email, password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  return <Screen>
    <ScreenHeader subtitle="Your finances, kept private and in sync" title={title} />
    <Card style={styles.card}>
      {!configured ? <AppText color="expense">Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your local environment to connect this app.</AppText> : null}
      {mode === 'register' ? <TextField label="Name" autoCapitalize="words" value={name} onChangeText={setName} /> : null}
      <TextField label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      {mode !== 'recovery' ? <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} /> : null}
      {authError || error ? <AppText color="expense">{error || authError}</AppText> : null}
      {message ? <AppText color="income">{message}</AppText> : null}
      <Button fullWidth label={busy ? 'Please wait…' : title} onPress={submit} disabled={!configured || busy} />
      <View style={styles.actions}>
        {mode !== 'login' ? <Button label="Sign in" variant="ghost" onPress={() => { setMode('login'); setError(''); }} /> : null}
        {mode !== 'register' ? <Button label="Create account" variant="ghost" onPress={() => { setMode('register'); setError(''); }} /> : null}
        {mode === 'login' ? <Button label="Forgot password?" variant="ghost" onPress={() => { setMode('recovery'); setError(''); }} /> : null}
      </View>
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({ card: { gap: spacing.lg }, actions: { alignItems: 'center', gap: spacing.xs } });
