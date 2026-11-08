import { useRef, useState } from 'react';
import { router } from 'expo-router';
import type { TextInputInstance } from 'react-native';

import { AuthLayout } from '@/components/auth/auth-layout';
import { PasswordField } from '@/components/auth/password-field';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { authErrorFeedback, validatePasswordReset } from '@/utils/auth-form';

export default function ResetPasswordScreen() {
  const { updatePassword, passwordRecovery, finishPasswordRecovery, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmationRef = useRef<TextInputInstance>(null);

  async function submit() {
    if (submitting.current || saved) return;
    setError('');
    const errors = validatePasswordReset(password, confirmation);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      if (errors.password) passwordRef.current?.focus();
      else confirmationRef.current?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await updatePassword(password);
      setSaved(true);
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      const feedback = authErrorFeedback(cause);
      if (feedback.field === 'password') setFieldErrors({ password: feedback.message });
      else setError(feedback.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <AuthLayout title={saved ? 'Password updated' : 'Choose a new password'}>
    {saved ? <>
      <AppText color="textSecondary" accessibilityLiveRegion="polite">Your new password is ready to use.</AppText>
      <Button fullWidth label="Done" onPress={() => {
        if (passwordRecovery) finishPasswordRecovery();
        else router.replace('/');
      }} />
    </> : <>
      <PasswordField label="New password" inputRef={passwordRef} editable={!busy} autoComplete="new-password" importantForAutofill="yes"
        hint="At least 8 characters." value={password} error={fieldErrors.password}
        onChangeText={(value) => { setPassword(value); setFieldErrors({}); setError(''); }}
        returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => confirmationRef.current?.focus()} />
      <PasswordField label="Confirm password" inputRef={confirmationRef} editable={!busy} autoComplete="new-password" importantForAutofill="yes"
        value={confirmation} error={fieldErrors.confirmation}
        onChangeText={(value) => { setConfirmation(value); setFieldErrors((previous) => ({ password: previous.password })); setError(''); }}
        returnKeyType="done" submitBehavior="submit" onSubmitEditing={() => void submit()} />
      {error ? <AppText color="expense" accessibilityLiveRegion="polite">{error}</AppText> : null}
      <Button fullWidth disabled={busy} label={busy ? 'Saving…' : 'Update password'} onPress={() => void submit()}
        accessibilityState={{ disabled: busy, busy }} />
      {passwordRecovery ? <Button label="Cancel and sign out" variant="ghost" disabled={busy}
        onPress={() => { void signOut().catch(() => setError('Could not sign out. Please try again.')); }} /> : null}
    </>}
  </AuthLayout>;
}
