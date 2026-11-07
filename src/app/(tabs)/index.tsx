import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BudgetOverviewCard } from '@/components/budgets/budget-overview-card';
import { SavingsSummaryCard } from '@/components/savings/savings-summary-card';
import { TransactionList } from '@/components/transactions/transaction-list';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { SAMPLE_PROFILE } from '@/data/profile';
import { useFinance } from '@/providers/finance-provider';
import { colors, radii, spacing } from '@/theme';
import { formatMoney, formatSignedMoney } from '@/utils/currency';
import { currentMonthLabel } from '@/utils/date';

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

type QuickActionProps = {
  label: string;
  icon: IconName;
  onPress: () => void;
};

function QuickAction({ label, icon, onPress }: QuickActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={styles.quickActionIcon}>
        <Icon name={icon} size={21} color="primary" />
      </View>
      <AppText variant="captionStrong" color="textSecondary" style={styles.quickActionLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const {
    budgets,
    monthlyExpenseMinor,
    monthlyIncomeMinor,
    savingsContributedMinor,
    savingsGoals,
    savingsTargetMinor,
    totalBalanceMinor,
    transactions,
  } = useFinance();

  const monthLabel = currentMonthLabel();
  const monthlyNetMinor = monthlyIncomeMinor - monthlyExpenseMinor;
  const recentTransactions = transactions.slice(0, 4);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="label" color="textMuted" style={styles.greeting}>
            {getGreeting()}, {SAMPLE_PROFILE.firstName}
          </AppText>
          <AppText variant="h1">My finances</AppText>
        </View>

        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          onPress={() => router.navigate('/profile')}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <AppText variant="bodyStrong" color="primary">
            {SAMPLE_PROFILE.initials}
          </AppText>
        </Pressable>
      </View>

      <Card style={styles.balanceCard} tone="primary">
        <AppText variant="label" color="primaryMuted">
          Total available balance
        </AppText>
        <AppText variant="display" color="textInverse" style={styles.balanceAmount}>
          {formatMoney(totalBalanceMinor)}
        </AppText>
        <AppText variant="body" color="primaryMuted">
          Across all your accounts
        </AppText>

        <View style={styles.balanceFooter}>
          <AppText variant="caption" color="primaryMuted">
            {monthLabel} net
          </AppText>
          <AppText variant="captionStrong" color="textInverse">
            {formatSignedMoney(monthlyNetMinor, monthlyNetMinor >= 0 ? 'income' : 'expense')}
          </AppText>
        </View>
      </Card>

      <View style={styles.summaryRow}>
        <StatCard
          caption={`${monthLabel} total`}
          icon="income"
          label="Income"
          tone="income"
          value={formatMoney(monthlyIncomeMinor)}
        />
        <StatCard
          caption={`${monthLabel} total`}
          icon="expense"
          label="Expenses"
          tone="expense"
          value={formatMoney(monthlyExpenseMinor)}
        />
      </View>

      <SectionHeader title="Quick actions" />

      <View style={styles.quickActions}>
        <QuickAction
          icon="expense"
          label="Add expense"
          onPress={() => router.navigate({ pathname: '/add', params: { type: 'expense' } })}
        />
        <QuickAction
          icon="income"
          label="Add income"
          onPress={() => router.navigate({ pathname: '/add', params: { type: 'income' } })}
        />
        <QuickAction
          icon="transfer"
          label="Transfer"
          onPress={() => router.navigate({ pathname: '/add', params: { type: 'transfer' } })}
        />
        <QuickAction
          icon="wallet"
          label="Accounts"
          onPress={() => router.navigate('/accounts')}
        />
        <QuickAction
          icon="budgets"
          label="Budgets"
          onPress={() => router.navigate('/budgets')}
        />
        <QuickAction
          icon="transactions"
          label="Analytics"
          onPress={() => router.navigate('/analytics')}
        />
      </View>

      <SectionHeader
        actionLabel="See all"
        onAction={() => router.navigate('/budgets')}
        title="Budget overview"
      />

      <BudgetOverviewCard budgets={budgets} />

      <SectionHeader actionLabel="Manage" onAction={() => router.navigate('/savings')} title="Savings goals" />

      <SavingsSummaryCard
        contributedMinor={savingsContributedMinor}
        goals={savingsGoals}
        targetMinor={savingsTargetMinor}
      />

      <SectionHeader
        actionLabel="See all"
        onAction={() => router.navigate('/transactions')}
        title="Recent transactions"
      />

      <TransactionList
        onSelect={(transaction) =>
          router.navigate({ pathname: '/transaction/[id]', params: { id: transaction.id } })
        }
        transactions={recentTransactions}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  greeting: {
    textTransform: 'uppercase',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  balanceCard: {
    gap: spacing.xs,
    padding: spacing.xl,
  },
  balanceAmount: {
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  balanceFooter: {
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexBasis: 84,
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 92,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  quickActionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  quickActionLabel: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
