import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';

import { spacing } from '@/theme';
import type { BudgetWithSpending } from '@/types/finance';
import { formatMoney, percentageOf } from '@/utils/currency';

type BudgetOverviewCardProps = {
  budgets: BudgetWithSpending[];
};

/**
 * Total budget allocation and usage. Shared by the dashboard and the budgets
 * screen so both always report the same integer-based totals.
 */
export function BudgetOverviewCard({ budgets }: BudgetOverviewCardProps) {
  const totalLimitMinor = budgets.reduce((total, budget) => total + budget.limitMinor, 0);
  const totalSpentMinor = budgets.reduce((total, budget) => total + budget.spentMinor, 0);
  const totalRemainingMinor = totalLimitMinor - totalSpentMinor;
  const progress = percentageOf(totalSpentMinor, totalLimitMinor);
  const isOverBudget = totalSpentMinor > totalLimitMinor;

  return (
    <Card style={styles.card} tone="primary">
      <AppText variant="label" color="primaryMuted">
        Monthly budget
      </AppText>
      <AppText variant="display" color="textInverse">
        {formatMoney(totalSpentMinor)}
      </AppText>
      <AppText variant="body" color="primaryMuted">
        of {formatMoney(totalLimitMinor)} across {budgets.length} categories
      </AppText>

      <View style={styles.progressWrap}>
        <ProgressBar progress={progress} tone={isOverBudget ? 'expense' : 'income'} />
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color="primaryMuted">
          {progress}% used
        </AppText>
        <AppText variant="captionStrong" color="primaryMuted">
          {isOverBudget
            ? `${formatMoney(Math.abs(totalRemainingMinor))} over budget`
            : `${formatMoney(totalRemainingMinor)} remaining`}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  progressWrap: {
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
