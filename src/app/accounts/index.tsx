import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { accountTypeLabel } from '@/data/accounts';
import { useFinance } from '@/providers/finance-provider';
import { colors, radii, spacing } from '@/theme';
import type { AccountWithBalance } from '@/types/finance';
import { formatMoney } from '@/utils/currency';

function AccountRow({ account }: { account: AccountWithBalance }) {
  return (
    <Pressable
      accessibilityLabel={`${account.name}, ${accountTypeLabel(account.type)}, ${formatMoney(
        account.balanceMinor
      )}${account.archived ? ', archived' : ''}`}
      accessibilityRole="button"
      onPress={() =>
        router.navigate({ pathname: '/accounts/[id]', params: { id: account.id } })
      }
      style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}
    >
      <View style={styles.accountIcon}>
        <Icon
          name={
            account.type === 'cash'
              ? 'cash'
              : account.type === 'bank'
                ? 'account'
                : account.type === 'other'
                  ? 'wallet'
                  : 'mobileMoney'
          }
          size={19}
          color="primary"
        />
      </View>
      <View style={styles.accountDetails}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {account.name}
        </AppText>
        <AppText numberOfLines={1} variant="caption" color="textMuted">
          {accountTypeLabel(account.type)}{account.archived ? ' · Archived' : ''}
        </AppText>
      </View>
      <AppText numberOfLines={1} variant="amountSmall" style={styles.amount}>
        {formatMoney(account.balanceMinor)}
      </AppText>
      <Icon name="chevronRight" size={15} color="textMuted" />
    </Pressable>
  );
}

export default function AccountsScreen() {
  const { accounts, allAccounts, totalBalanceMinor } = useFinance();
  const archivedAccounts = allAccounts.filter((account) => account.archived);

  return (
    <Screen>
      <BackLink />
      <ScreenHeader
        right={
          <Button
            icon="add"
            label="Add"
            onPress={() => router.navigate('/accounts/manage')}
            size="sm"
          />
        }
        subtitle="Manage balances across cash, banks and mobile money"
        title="Accounts"
      />

      <Card style={styles.totalCard} tone="primary">
        <AppText variant="label" color="primaryMuted">
          TOTAL ACTIVE BALANCE
        </AppText>
        <AppText variant="display" color="textInverse">
          {formatMoney(totalBalanceMinor)}
        </AppText>
        <AppText variant="caption" color="primaryMuted">
          Across {accounts.length} active {accounts.length === 1 ? 'account' : 'accounts'}
        </AppText>
      </Card>

      <SectionHeader title="Active accounts" />
      {accounts.length > 0 ? (
        <Card padded={false} style={styles.accountList}>
          {accounts.map((account, index) => (
            <View key={account.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <AccountRow account={account} />
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState
          action={
            <Button
              label="Create account"
              onPress={() => router.navigate('/accounts/manage')}
            />
          }
          icon="wallet"
          message="Add an account to start tracking balances and transactions."
          title="No active accounts"
        />
      )}

      {archivedAccounts.length > 0 ? (
        <>
          <SectionHeader title="Archived accounts" />
          <Card padded={false} style={styles.accountList}>
            {archivedAccounts.map((account, index) => (
              <View key={account.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <AccountRow account={account} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.xl,
  },
  accountList: {
    overflow: 'hidden',
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  accountIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  accountDetails: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  amount: {
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginLeft: spacing.lg + 42 + spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
});
