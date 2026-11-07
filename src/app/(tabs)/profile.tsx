import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuth } from '@/providers/auth-provider';
import { useFinance } from '@/providers/finance-provider';
import { colors, radii, spacing } from '@/theme';

type InfoRowProps = {
  icon: IconName;
  label: string;
  value: string;
  divider?: boolean;
};

function InfoRow({ icon, label, value, divider = false }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, divider && styles.infoRowDivider]}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={17} color="primary" />
      </View>
      <AppText variant="body" color="textSecondary" style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

export default function ProfileScreen() {
  const { resetData, dataError, dataLoading } = useFinance();
  const { user, signOut } = useAuth();
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [restored, setRestored] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const profileName = String(user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User');
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  function confirmReset() {
    resetData();
    setResetModalVisible(false);
    setRestored(true);
  }

  return (
    <Screen>
      <ScreenHeader subtitle="Account details and app information" title="Profile" />

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <AppText variant="h3" color="textInverse">
            {initials}
          </AppText>
        </View>
        <View style={styles.profileText}>
          <AppText variant="h2">{profileName}</AppText>
          <AppText variant="body" color="textSecondary">
            {user?.email}
          </AppText>
        </View>
      </Card>

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
        <InfoRow divider icon="account" label="Country" value="Zambia" />
        <InfoRow
          divider
          icon="calendar"
          label="Member since"
          value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
        />
      </Card>

      <SectionHeader title="Application" />
      <Card padded={false} style={styles.infoCard}>
        <InfoRow icon="info" label="App" value="Smart Money Tracker" />
        <InfoRow divider icon="shield" label="Version" value={`v${version}`} />
        <InfoRow divider icon="wallet" label="Theme" value="Light" />
        <InfoRow divider icon="transactions" label="Data" value={dataLoading ? 'Syncing…' : 'Cloud synced'} />
      </Card>
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
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  profileText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
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
  infoRowDivider: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
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
