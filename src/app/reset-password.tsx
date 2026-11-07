import { useState } from 'react';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme';

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit() {
    setError('');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    if (password !== confirmation) return setError('The passwords do not match.');
    setBusy(true);
    try { await updatePassword(password); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your password.'); }
    finally { setBusy(false); }
  }
  return <Screen>
    <ScreenHeader title="Choose a new password" subtitle="Use at least 8 characters." />
    <Card style={{ gap: spacing.lg }}>
      <TextField label="New password" secureTextEntry value={password} onChangeText={setPassword} />
      <TextField label="Confirm password" secureTextEntry value={confirmation} onChangeText={setConfirmation} />
      {error ? <AppText color="expense">{error}</AppText> : null}
      {saved ? <AppText color="income">Password updated successfully.</AppText> : null}
      <Button fullWidth disabled={busy} label={saved ? 'Done' : busy ? 'Saving…' : 'Update password'} onPress={() => saved ? router.replace('/') : void submit()} />
    </Card>
  </Screen>;
}
