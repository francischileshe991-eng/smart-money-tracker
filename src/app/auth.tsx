import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInputInstance } from 'react-native';

import { AuthLayout } from '@/components/auth/auth-layout';
import { PasswordField } from '@/components/auth/password-field';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme';
import { authErrorFeedback, validateAuthForm, type AuthFieldErrors, type AuthMode } from '@/utils/auth-form';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword, configured, error: authError, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const nameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const title = mode === 'register' ? 'Create account' : mode === 'recovery' ? 'Reset password' : 'Welcome back';
  const actionLabel = mode === 'register' ? 'Create account' : mode === 'recovery' ? 'Send reset link' : 'Sign in';

  function switchMode(nextMode: AuthMode) {
    if (submitting.current) return;
    setMode(nextMode);
    setPassword('');
    setFieldErrors({});
    setMessage('');
    setError('');
    clearError();
  }

  function updateField(field: keyof AuthFieldErrors, value: string) {
    if (field === 'name') setName(value);
    else if (field === 'email') setEmail(value);
    else setPassword(value);
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setError('');
    setMessage('');
    clearError();
  }

  async function submit() {
    if (submitting.current || !configured) return;
    setError('');
    setMessage('');
    clearError();
    const errors = validateAuthForm(mode, { name, email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      if (errors.name) nameRef.current?.focus();
      else if (errors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (mode === 'recovery') {
        await resetPassword(email.trim());
        setMessage('If an account uses this email, a password reset link is on its way. Check your inbox and spam folder.');
      } else if (mode === 'register') {
        await signUp(email.trim(), password, name.trim());
        setPassword('');
        setMode('login');
        setMessage('Check your email to confirm your account, then sign in.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (cause) {
      const feedback = authErrorFeedback(cause);
      if (feedback.field) setFieldErrors({ [feedback.field]: feedback.message });
      else setError(feedback.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <AuthLayout title={title} subtitle={mode === 'recovery' ? 'Enter your email to receive a reset link.' : undefined}>
    {!configured ? <AppText color="expense" accessibilityLiveRegion="polite">Sign-in is temporarily unavailable. Please try again later.</AppText> : null}
    {mode === 'register' ? <TextField
      label="Name" inputRef={nameRef} autoComplete="name" autoCapitalize="words"
      editable={!busy} value={name} error={fieldErrors.name}
      onChangeText={(value) => updateField('name', value)} returnKeyType="next" submitBehavior="submit"
      onSubmitEditing={() => emailRef.current?.focus()}
    /> : null}
    <TextField
      label="Email" inputRef={emailRef} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
      autoComplete={mode === 'login' ? 'username' : 'email'} importantForAutofill="yes"
      editable={!busy} value={email} error={fieldErrors.email} onChangeText={(value) => updateField('email', value)}
      returnKeyType={mode === 'recovery' ? 'send' : 'next'} submitBehavior="submit"
      onSubmitEditing={() => mode === 'recovery' ? void submit() : passwordRef.current?.focus()}
    />
    {mode !== 'recovery' ? <View style={styles.passwordGroup}>
      <PasswordField
        key={mode} inputRef={passwordRef} editable={!busy} value={password} error={fieldErrors.password}
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'} importantForAutofill="yes"
        hint={mode === 'register' ? 'At least 8 characters.' : undefined}
        onChangeText={(value) => updateField('password', value)} returnKeyType="go" submitBehavior="submit"
        onSubmitEditing={() => void submit()}
      />
      {mode === 'login' ? <Pressable accessibilityRole="button" disabled={busy}
        accessibilityState={{ disabled: busy }} onPress={() => switchMode('recovery')}
        style={({ pressed }) => [styles.forgotPassword, pressed && styles.pressed]}>
        <AppText variant="link" color="primary">Forgot password?</AppText>
      </Pressable> : null}
    </View> : null}
    {error || authError ? <AppText color="expense" accessibilityLiveRegion="polite">
      {error || authError}
    </AppText> : null}
    {message ? <AppText color="income" accessibilityLiveRegion="polite">{message}</AppText> : null}
    <Button fullWidth label={busy ? mode === 'login' ? 'Signing in…' : mode === 'register' ? 'Creating account…' : 'Sending link…' : actionLabel}
      onPress={() => void submit()} disabled={!configured || busy} accessibilityState={{ disabled: !configured || busy, busy }} />
    <View style={styles.footer}>
      {mode === 'recovery' ? <Button label="Back to sign in" variant="ghost" disabled={busy} onPress={() => switchMode('login')} /> : <>
        <AppText variant="caption" color="textSecondary">{mode === 'login' ? 'New here?' : 'Already have an account?'}</AppText>
        <Button label={mode === 'login' ? 'Create account' : 'Sign in'} variant="ghost" disabled={busy}
          onPress={() => switchMode(mode === 'login' ? 'register' : 'login')} />
      </>}
    </View>
  </AuthLayout>;
}

const styles = StyleSheet.create({
  passwordGroup: { gap: spacing.xs },
  forgotPassword: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.65 },
});
