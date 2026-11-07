import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ProgressBar, type ProgressTone } from '@/components/ui/progress-bar';

import { getCategoryIcon } from '@/data/categories';
import { colors, radii, spacing } from '@/theme';
import type { BudgetWithSpending } from '@/types/finance';
import { formatMoney, percentageOf } from '@/utils/currency';

type BudgetRowProps = {
  budget: BudgetWithSpending;
  onPress?: () => void;
};

export function BudgetRow({ budget, onPress }: BudgetRowProps) {
  const progress = percentageOf(budget.spentMinor, budget.limitMinor);
  const isOverBudget = budget.spentMinor > budget.limitMinor;
  const isNearLimit = !isOverBudget && progress >= (budget.warningThreshold ?? 80);
  const remainingMinor = budget.limitMinor - budget.spentMinor;

  const tone: ProgressTone = isOverBudget ? 'expense' : isNearLimit ? 'warning' : 'income';
  const statusColor = isOverBudget ? 'expense' : isNearLimit ? 'warning' : 'textMuted';
  const remainingLabel = isOverBudget
    ? `${formatMoney(Math.abs(remainingMinor))} over`
    : `${formatMoney(remainingMinor)} left`;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${budget.category} budget`} onPress={onPress}>
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Icon name={getCategoryIcon(budget.category)} size={19} color="primary" />
        </View>

        <View style={styles.details}>
          <AppText variant="bodyStrong">{budget.category}</AppText>
          <AppText variant="caption" color="textMuted">
            {formatMoney(budget.spentMinor)} of {formatMoney(budget.limitMinor)}
          </AppText>
        </View>

        <View style={styles.status}>
          <AppText variant="captionStrong" color={isOverBudget ? 'expense' : 'textSecondary'}>
            {progress}%
          </AppText>
          <AppText variant="caption" color={statusColor}>
            {remainingLabel}
          </AppText>
        </View>
      </View>

      <ProgressBar progress={progress} tone={tone} />
    </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  details: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  status: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
