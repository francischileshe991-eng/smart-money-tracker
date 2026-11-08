import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ProgressBar, type ProgressTone } from '@/components/ui/progress-bar';
import { spacing, useThemeColors } from '@/theme';
import type { BudgetWithSpending } from '@/types/finance';
import { formatMoney, percentageOf } from '@/utils/currency';
import { formatDateLabel } from '@/utils/date';

type BudgetRowProps = {
  budget: BudgetWithSpending;
  onPress?: () => void;
};

export function BudgetRow({ budget, onPress }: BudgetRowProps) {
  const colors = useThemeColors();
  const progress = percentageOf(budget.spentMinor, budget.limitMinor);
  const remainingMinor = budget.limitMinor - budget.spentMinor;
  const isOverBudget = remainingMinor < 0;
  const isNearLimit = !isOverBudget && progress >= (budget.warningThreshold ?? 80);
  const tone: ProgressTone = isOverBudget ? 'expense' : isNearLimit ? 'warning' : 'primary';
  const remainingLabel = `${formatMoney(Math.abs(remainingMinor))} ${isOverBudget ? 'over' : 'left'}`;
  const periodLabel = budget.period === 'custom'
    ? budget.startDate && budget.endDate
      ? `${formatDateLabel(budget.startDate)} – ${formatDateLabel(budget.endDate)}`
      : 'Custom period'
    : 'Monthly';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${budget.category} budget. ${formatMoney(budget.spentMinor)} spent of ${formatMoney(budget.limitMinor)}. ${remainingLabel}. ${periodLabel}.${onPress ? ' Edit budget.' : ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <AppText variant="bodyStrong" style={styles.category}>{budget.category}</AppText>
        <AppText variant="caption" color={isOverBudget ? 'expense' : isNearLimit ? 'warning' : 'textSecondary'}>
          {remainingLabel}
        </AppText>
      </View>
      <AppText variant="caption" color="textSecondary">
        {formatMoney(budget.spentMinor)} of {formatMoney(budget.limitMinor)}
      </AppText>
      <View style={styles.progress}><ProgressBar size="sm" progress={progress} tone={tone} /></View>
      <AppText variant="caption" color="textMuted">{periodLabel}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { borderBottomWidth: 1, paddingVertical: spacing.xl, gap: spacing.sm },
  topRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  category: { flexGrow: 1, flexShrink: 1 },
  progress: { marginVertical: spacing.xs },
  pressed: { opacity: 0.65 },
});
