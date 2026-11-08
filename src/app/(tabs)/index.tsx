import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile-avatar';
import { SyncStatusBanner } from '@/components/sync/sync-status-banner';
import { TransactionList } from '@/components/transactions/transaction-list';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuth } from '@/providers/auth-provider';
import { useFinance } from '@/providers/finance-provider';
import { radii, spacing, useThemeColors } from '@/theme';
import { formatMoney, formatSignedMoney } from '@/utils/currency';
import { currentMonthLabel } from '@/utils/date';

function OverviewLink({ title, detail, href }: {
  title: string; detail: string; href: Href;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={() => router.navigate(href)}
      style={({ pressed }) => [styles.overviewLink, { borderColor: colors.border }, pressed && styles.pressed]}
    >
      <View style={styles.linkText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color="textSecondary">{detail}</AppText>
      </View>
      <Icon name="chevronRight" color="textMuted" size={16} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const {
    accounts, allAccounts, budgets, monthlyExpenseMinor, monthlyIncomeMinor,
    savingsGoals, totalBalanceMinor, transactions,
  } = useFinance();
  const [balanceDetailsVisible, setBalanceDetailsVisible] = useState(false);
  const monthLabel = currentMonthLabel();
  const profileName = String(user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'there');
  const monthlyNetMinor = monthlyIncomeMinor - monthlyExpenseMinor;
  const recentTransactions = useMemo(
    () => [...transactions].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 4),
    [transactions]
  );
  const budgetNeedingAttention = budgets.find((budget) => budget.warning === 'over')
    ?? budgets.find((budget) => budget.warning === 'near');
  const budgetDetail = budgetNeedingAttention
    ? `${budgetNeedingAttention.category}: ${budgetNeedingAttention.remainingMinor < 0
      ? `${formatMoney(-budgetNeedingAttention.remainingMinor)} over budget`
      : `${formatMoney(budgetNeedingAttention.remainingMinor)} left`}`
    : budgets.length ? `${budgets.length} active ${budgets.length === 1 ? 'budget' : 'budgets'}` : 'No budgets set';
  const activeGoals = savingsGoals.filter((goal) => !goal.completed);
  const savingsDetail = activeGoals.length
    ? `${activeGoals.length} ${activeGoals.length === 1 ? 'goal' : 'goals'} in progress`
    : 'No active goals';

  return (
    <Screen>
      <SyncStatusBanner />
      <View style={styles.header}>
        <View style={styles.linkText}>
          <AppText variant="h1">Your money. Made clear.</AppText>
          <AppText variant="caption" color="textSecondary">{monthLabel} {new Date().getFullYear()}</AppText>
        </View>
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          onPress={() => router.navigate('/profile')}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <ProfileAvatar name={profileName} size={44} />
        </Pressable>
      </View>

      {accounts.length === 0 ? (
        <Card style={styles.welcomeCard}>
          <AppText variant="h2">{allAccounts.length ? 'No active accounts' : 'Add an account'}</AppText>
          <AppText color="textSecondary">
            {allAccounts.length
              ? 'Restore an archived account or add a new one to start recording transactions.'
              : 'Add your cash, bank or mobile money account and its current balance.'}
          </AppText>
          <Button label={allAccounts.length ? 'Manage accounts' : 'Add account'}
            onPress={() => router.navigate(allAccounts.length ? '/accounts' : '/accounts/manage')} />
        </Card>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Available balance ${formatMoney(totalBalanceMinor)}. See account breakdown.`}
            onPress={() => setBalanceDetailsVisible(true)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.balanceCard}>
              <AppText variant="body" color="textSecondary">Available balance</AppText>
              <AppText variant="display" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={styles.balanceAmount}>
                {formatMoney(totalBalanceMinor)}
              </AppText>
              <View style={styles.row}>
                <AppText color="textSecondary" variant="caption">
                  {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                </AppText>
                <Icon name="chevronRight" color="textMuted" size={14} />
              </View>
            </View>
          </Pressable>
          <View style={styles.actions}>
            <Button label="Expense" accessibilityLabel="Add expense" variant="outline" style={styles.action}
              onPress={() => router.navigate({ pathname: '/add', params: { type: 'expense' } })} />
              <Button label="Income" variant="outline" style={styles.action}
                onPress={() => router.navigate({ pathname: '/add', params: { type: 'income' } })} />
              <Button label="Transfer" variant="outline" style={styles.action}
                onPress={() => router.navigate({ pathname: '/add', params: { type: 'transfer' } })} />
          </View>
        </>
      )}

      <SectionHeader title="This month" actionLabel="Analytics" onAction={() => router.navigate('/analytics')} />
      <View style={[styles.monthCard, { borderColor: colors.border }]}>
        <View style={styles.monthStat}>
          <AppText variant="caption" color="textSecondary">Income</AppText>
          <AppText variant="amountSmall" color="income">{formatMoney(monthlyIncomeMinor)}</AppText>
        </View>
        <View style={[styles.monthStat, styles.expenseStat, { borderLeftColor: colors.border }]}>
          <AppText variant="caption" color="textSecondary">Expenses</AppText>
          <AppText variant="amountSmall">{formatMoney(monthlyExpenseMinor)}</AppText>
        </View>
      </View>
      <View style={styles.netRow}>
        <AppText variant="caption" color="textSecondary">Net</AppText>
        <AppText variant="caption" color={monthlyNetMinor < 0 ? 'expense' : 'textSecondary'}>
          {formatSignedMoney(monthlyNetMinor, monthlyNetMinor >= 0 ? 'income' : 'expense')}
        </AppText>
      </View>

      <SectionHeader title="Recent activity" actionLabel="See all" onAction={() => router.navigate('/transactions')} />
      <TransactionList
        emptyAction={<Button label={accounts.length ? 'Add expense' : 'Add an account'}
          onPress={() => router.navigate(accounts.length ? '/add' : '/accounts/manage')} />}
        emptyMessage="Your income, expenses and transfers will appear here."
        onSelect={(transaction) => router.navigate({ pathname: '/transaction/[id]', params: { id: transaction.id } })}
        transactions={recentTransactions}
      />

      <SectionHeader title="Manage" />
      <View>
        <OverviewLink title="Budgets" detail={budgetDetail} href="/budgets" />
        <OverviewLink title="Savings goals" detail={savingsDetail} href="/savings" />
        <OverviewLink title="Accounts" detail={`${accounts.length} active ${accounts.length === 1 ? 'account' : 'accounts'}`} href="/accounts" />
      </View>

      <Modal visible={balanceDetailsVisible} onClose={() => setBalanceDetailsVisible(false)} title="Account balances"
        actions={<Button fullWidth label="Manage accounts" onPress={() => {
          setBalanceDetailsVisible(false);
          router.navigate('/accounts');
        }} />}>
        {accounts.map((account) => (
          <View key={account.id} style={styles.row}>
            <AppText style={styles.linkText}>{account.name}</AppText>
            <AppText variant="bodyStrong">{formatMoney(account.balanceMinor)}</AppText>
          </View>
        ))}
        <View style={[styles.row, styles.monthNet, { borderTopColor: colors.border }]}>
          <AppText variant="bodyStrong">Available balance</AppText>
          <AppText variant="bodyStrong">{formatMoney(totalBalanceMinor)}</AppText>
        </View>
        <AppText variant="caption" color="textSecondary">
          Each balance includes the opening balance and recorded transactions. Archived accounts are excluded.
        </AppText>
        <AppText variant="caption" color="textSecondary">
          Savings goals track progress separately and do not reduce this balance.
        </AppText>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.huge },
  linkText: { flex: 1, gap: spacing.xs, minWidth: 0 },
  avatar: { alignItems: 'center', borderRadius: radii.pill, minHeight: 44, minWidth: 44, justifyContent: 'center' },
  balanceCard: { gap: spacing.sm, paddingVertical: spacing.sm },
  balanceAmount: { fontSize: 42, lineHeight: 52, fontWeight: '500', letterSpacing: -1.4, fontVariant: ['tabular-nums'] },
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  monthCard: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: spacing.lg, rowGap: spacing.md },
  monthStat: { flexBasis: 130, flexGrow: 1, gap: spacing.sm },
  expenseStat: { borderLeftWidth: 1, paddingLeft: spacing.lg },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  monthNet: { borderTopWidth: 1, paddingTop: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xxl },
  action: { flexGrow: 1, flexBasis: 72, paddingHorizontal: spacing.md },
  welcomeCard: { gap: spacing.md },
  overviewLink: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 72, paddingVertical: spacing.lg, borderBottomWidth: 1 },
  pressed: { opacity: 0.75 },
});
