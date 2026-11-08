import { StyleSheet, View } from 'react-native';

import { SavingsGoalProgress } from './savings-goal-progress';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';

import { radii, spacing, useThemeColors } from '@/theme';
import type { SavingsGoal } from '@/types/finance';
import { formatMoney, percentageOf } from '@/utils/currency';

type SavingsSummaryCardProps = {
  goals: SavingsGoal[];
  contributedMinor: number;
  targetMinor: number;
};

export function SavingsSummaryCard({
  goals,
  contributedMinor,
  targetMinor,
}: SavingsSummaryCardProps) {
  const colors = useThemeColors();
  const progress = percentageOf(contributedMinor, targetMinor);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AppText variant="caption" color="textSecondary">
            Total saved
          </AppText>
          <AppText variant="amountSmall">{formatMoney(contributedMinor)}</AppText>
          <AppText variant="caption" color="textMuted">
            of {formatMoney(targetMinor)} across{' '}
            {goals.length === 1 ? '1 goal' : `${goals.length} goals`}
          </AppText>
        </View>

        <View style={[styles.percentBadge, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="captionStrong" color="primary">
            {progress}%
          </AppText>
        </View>
      </View>

      <ProgressBar progress={progress} tone={progress >= 100 ? 'income' : 'primary'} />

      {goals.length > 0 ? (
          <View style={[styles.goals, { borderTopColor: colors.border }]}>
          {goals.map((goal) => (
            <SavingsGoalProgress goal={goal} key={goal.id} />
          ))}
        </View>
      ) : (
        <AppText variant="body" color="textSecondary">
          No savings goals yet.
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  percentBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 52,
    paddingHorizontal: spacing.md,
  },
  goals: {
    borderTopWidth: 1,
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
});
