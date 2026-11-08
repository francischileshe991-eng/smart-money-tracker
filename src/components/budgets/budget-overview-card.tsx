import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { spacing } from '@/theme';
import type { BudgetWithSpending } from '@/types/finance';
import { formatMoney, percentageOf } from '@/utils/currency';

type BudgetOverviewCardProps = {
  budgets: BudgetWithSpending[];
};

/** Summary of spending across the periods configured on the supplied budgets. */
export function BudgetOverviewCard({ budgets }: BudgetOverviewCardProps) {
  const totalLimitMinor = budgets.reduce((total, budget) => total + budget.limitMinor, 0);
  const totalSpentMinor = budgets.reduce((total, budget) => total + budget.spentMinor, 0);
  const remainingMinor = totalLimitMinor - totalSpentMinor;
  const isOverBudget = remainingMinor < 0;
  const includesCustomPeriods = budgets.some((budget) => budget.period === 'custom');

  return (
    <View style={styles.summary}>
      <AppText color="textSecondary">Budgeted spending</AppText>
      <AppText variant="display" style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {formatMoney(totalSpentMinor)}
      </AppText>
      <AppText variant="caption" color="textSecondary">of {formatMoney(totalLimitMinor)} allocated</AppText>
      <View style={styles.progress}>
        <ProgressBar size="sm" progress={percentageOf(totalSpentMinor, totalLimitMinor)} tone={isOverBudget ? 'expense' : 'primary'} />
      </View>
      <View style={styles.footer}>
        <AppText variant="caption" color={isOverBudget ? 'expense' : 'textSecondary'}>
          {formatMoney(Math.abs(remainingMinor))} {isOverBudget ? 'over budget' : 'left'}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {budgets.length} {budgets.length === 1 ? 'category' : 'categories'}
        </AppText>
      </View>
      {includesCustomPeriods ? <AppText variant="caption" color="textMuted">Includes custom budget periods</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.sm, paddingVertical: spacing.lg },
  amount: { fontSize: 38, lineHeight: 48, fontWeight: '500', letterSpacing: -1 },
  progress: { marginTop: spacing.lg },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
});
