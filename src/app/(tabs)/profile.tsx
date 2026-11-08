import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProfileAvatar, PROFILE_ICON_OPTIONS, type ProfileIconId } from '@/components/profile-avatar';
import { PasswordField } from '@/components/auth/password-field';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { SyncStatusBanner } from '@/components/sync/sync-status-banner';
import { useAuth } from '@/providers/auth-provider';
import { useFinance } from '@/providers/finance-provider';
import { supabase } from '@/lib/supabase';
import { radii, spacing, useAppTheme, useThemeColors, type AppThemeMode } from '@/theme';

type InfoRowProps = {
  icon: IconName;
  label: string;
  value: string;
  onPress?: () => void;
};

function InfoRow({ icon, label, value, onPress }: InfoRowProps) {
  const colors = useThemeColors();
  const content = (
    <>
      <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={17} color="primary" />
      </View>
      <AppText variant="body" color="textSecondary" style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.infoValue}>
        {value}
      </AppText>
      {onPress ? <Icon name="chevronRight" size={16} color="textMuted" /> : null}
    </>
  );
  const rowStyle = styles.infoRow;
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [rowStyle, pressed && styles.profileIconPressed]}>
      {content}
    </Pressable>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
}

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { resetData, clearDeviceData, dataError, dataLoading, lastSyncedAt, pendingChanges, syncStatus } = useFinance();
  const { user, signOut, deleteAccount } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useAppTheme();
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [restored, setRestored] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [profileIconError, setProfileIconError] = useState('');
  const [profileIconSaving, setProfileIconSaving] = useState(false);
  const [themeSaveError, setThemeSaveError] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function confirmAccountDeletion() {
    if (deleting) return;
    if (!deletePassword || deleteConfirmation !== 'DELETE') {
      setDeleteError('Enter your current password and type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try { await deleteAccount(deletePassword, clearDeviceData); }
    catch (cause) { setDeleteError(cause instanceof Error ? cause.message : 'Could not delete your account.'); }
    finally { setDeleting(false); }
  }

  function closeDeletion() {
    if (deleting) return;
    setDeleteVisible(false);
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteError('');
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const profileName = String(user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User');
  const selectedProfileIconId = PROFILE_ICON_OPTIONS.find((option) => option.id === user?.user_metadata?.profile_icon)?.id ?? 'profile';
  const dataLabel = dataLoading
    ? 'Loading…'
    : syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'conflict'
        ? 'Conflict'
        : syncStatus === 'error'
          ? 'Sync error'
          : syncStatus === 'offline'
            ? pendingChanges
              ? 'Offline · saved locally'
              : 'Offline · cached'
            : pendingChanges
              ? 'Pending changes'
              : lastSyncedAt
                ? 'Cloud synced'
                : 'Saved locally';
  const lastSyncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not synced yet';

  function confirmReset() {
    resetData();
    setResetModalVisible(false);
    setRestored(true);
  }

  async function selectProfileIcon(iconId: ProfileIconId) {
    setProfileIconError('');
    if (!supabase || !user) {
      setProfileIconError('Profile settings are unavailable right now.');
      return;
    }
    setProfileIconSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { profile_icon: iconId } });
      if (error) throw error;
      setIconPickerVisible(false);
    } catch (cause) {
      setProfileIconError(cause instanceof Error ? cause.message : 'Could not save your profile icon.');
    } finally {
      setProfileIconSaving(false);
    }
  }

  async function selectTheme(mode: AppThemeMode) {
    setThemeSaveError('');
    try {
      await setThemeMode(mode);
      setThemePickerVisible(false);
    } catch {
      setThemeSaveError('Could not save your theme preference. Please try again.');
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Profile" />

      <SyncStatusBanner />

      <Card style={styles.profileCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile icon"
          accessibilityState={{ disabled: profileIconSaving, busy: profileIconSaving }}
          disabled={profileIconSaving}
          onPress={() => setIconPickerVisible(true)}
          style={({ pressed }) => [styles.avatarAction, pressed && styles.profileIconPressed]}
        >
          <ProfileAvatar name={profileName} size={56} />
          <AppText variant="link" color="primary">Edit</AppText>
        </Pressable>
        <View style={styles.profileText}>
          <AppText variant="h2">{profileName}</AppText>
          <AppText variant="body" color="textSecondary">
            {user?.email}
          </AppText>
        </View>
      </Card>

      <Modal
        onClose={() => setIconPickerVisible(false)}
        title="Profile icon"
        visible={iconPickerVisible}
      >
        <View style={styles.profileIconGrid}>
          {PROFILE_ICON_OPTIONS.map((option) => {
            const isSelected = selectedProfileIconId === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={`${option.label} profile icon`}
                accessibilityState={{ selected: isSelected, disabled: profileIconSaving }}
                disabled={profileIconSaving}
                onPress={() => { void selectProfileIcon(option.id); }}
                style={({ pressed }) => [
                  styles.profileIconOption,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt },
                  isSelected && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                  pressed && styles.profileIconPressed,
                ]}
              >
                <Icon name={option.icon} size={32} color="primary" />
                <AppText variant="captionStrong" color="textSecondary">{option.label}</AppText>
                {isSelected ? <View style={styles.profileIconCheck}><Icon name="check" size={14} color="income" /></View> : null}
              </Pressable>
            );
          })}
        </View>
        {profileIconSaving ? <AppText variant="caption" color="textSecondary" accessibilityLiveRegion="polite">Saving icon…</AppText> : null}
        {profileIconError ? <AppText color="expense" accessibilityLiveRegion="polite">{profileIconError}</AppText> : null}
      </Modal>

      <SectionHeader title="Account" />
      <Button
        fullWidth
        icon="wallet"
        label="Manage financial accounts"
        onPress={() => router.navigate('/accounts')}
        variant="secondary"
      />
      <Card padded={false} style={styles.infoCard}>
        <InfoRow icon="wallet" label="Currency" value="ZMW" />
        <InfoRow icon="account" label="Country" value="Zambia" />
        <InfoRow
          icon="calendar"
          label="Member since"
          value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
        />
      </Card>

      <SectionHeader title="Application" />
      <Card padded={false} style={styles.infoCard}>
        <InfoRow icon="info" label="App" value="Smart Money Tracker" />
        <InfoRow icon="shield" label="Version" value={`v${version}`} />
        <InfoRow
          icon={themeMode === 'dark' ? 'darkMode' : 'lightMode'}
          label="Theme"
          onPress={() => setThemePickerVisible(true)}
          value={themeMode === 'dark' ? 'Dark' : 'Light'}
        />
        <InfoRow icon="transactions" label="Data" value={dataLabel} />
        <InfoRow icon="calendar" label="Last sync" value={lastSyncLabel} />
      </Card>
      <Modal
        description="Choose how Smart Money Tracker looks on this device."
        onClose={() => setThemePickerVisible(false)}
        title="Application theme"
        visible={themePickerVisible}
      >
        <View style={styles.themeChoices}>
          {(['light', 'dark'] as const).map((option) => {
            const selected = themeMode === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => { void selectTheme(option); }}
                style={({ pressed }) => [
                  styles.themeChoice,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  selected && { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted },
                  pressed && styles.profileIconPressed,
                ]}
              >
                <Icon name={option === 'dark' ? 'darkMode' : 'lightMode'} size={20} color={selected ? 'primary' : 'textSecondary'} />
                <AppText variant="bodyStrong" style={styles.themeChoiceLabel}>{option === 'dark' ? 'Dark' : 'Light'}</AppText>
                {selected ? <Icon name="check" size={18} color="income" /> : null}
              </Pressable>
            );
          })}
        </View>
        {themeSaveError ? <AppText variant="caption" color="expense">{themeSaveError}</AppText> : null}
      </Modal>
      {dataError ? <AppText color="expense">Sync error: {dataError}</AppText> : null}
      {signOutError ? <AppText color="expense">{signOutError}</AppText> : null}
      <Button fullWidth label="Sign out" onPress={() => { void signOut().catch((error: unknown) => setSignOutError(error instanceof Error ? error.message : 'Could not sign out.')); }} variant="secondary" />

      <View style={styles.resetSection}>
        <Button
          fullWidth
          icon="reset"
          label="Clear all financial data"
          onPress={() => {
            setRestored(false);
            setResetModalVisible(true);
          }}
          variant="secondary"
        />
        {restored ? (
          <AppText variant="caption" color="income" style={styles.restoredText}>
            Financial data cleared.
          </AppText>
        ) : null}
      </View>

      <Button label="Delete account" variant="danger" style={styles.resetSection}
        onPress={() => setDeleteVisible(true)} />
      <Modal title="Delete your account?" visible={deleteVisible} onClose={closeDeletion}
        description="This permanently deletes your sign-in account and all accounts, transactions, budgets, savings goals and contributions. This cannot be undone."
        actions={<>
          <Button label="Cancel" onPress={closeDeletion} disabled={deleting} style={styles.modalAction} />
          <Button label={deleting ? 'Deleting…' : 'Delete account'} variant="danger" disabled={deleting}
            onPress={() => { void confirmAccountDeletion(); }} style={styles.modalAction} />
        </>}>
        <PasswordField label="Current password" autoComplete="current-password" value={deletePassword} onChangeText={setDeletePassword} editable={!deleting} />
        <TextField label="Type DELETE to confirm" autoCapitalize="characters" autoCorrect={false}
          value={deleteConfirmation} onChangeText={setDeleteConfirmation} editable={!deleting} />
        {deleteError ? <AppText color="expense" accessibilityLiveRegion="polite">{deleteError}</AppText> : null}
      </Modal>

      <Modal
        actions={
          <>
            <Button
              label="Cancel"
              onPress={() => setResetModalVisible(false)}
              style={styles.modalAction}
              variant="secondary"
            />
            <Button
              label="Reset"
              onPress={confirmReset}
              style={styles.modalAction}
              variant="danger"
            />
          </>
        }
        description="This permanently deletes all your accounts, transactions, budgets, savings goals and contributions from your cloud account. This cannot be undone."
        onClose={() => setResetModalVisible(false)}
        title="Clear your financial data?"
        visible={resetModalVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarAction: {
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 56,
  },
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  profileText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  profileIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  themeChoices: {
    gap: spacing.sm,
  },
  themeChoice: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  themeChoiceLabel: {
    flex: 1,
  },
  profileIconOption: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 0,
    gap: spacing.sm,
    minHeight: 88,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  profileIconCheck: { position: 'absolute', top: spacing.xs, right: spacing.xs },
  profileIconPressed: { opacity: 0.72 },
  infoCard: {
    overflow: 'hidden',
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoIcon: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  infoLabel: {
    flex: 1,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  resetSection: {
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  restoredText: {
    textAlign: 'center',
  },
  modalAction: {
    flex: 1,
  },
});
