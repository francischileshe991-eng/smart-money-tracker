import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';

import { colors, radii, spacing } from '@/theme';
import type { SavingsGoal } from '@/types/finance';
import { formatMoney, percentageOf } from '@/utils/currency';

type SavingsGoalProgressProps = {
  goal: SavingsGoal;
};

export function SavingsGoalProgress({ goal }: SavingsGoalProgressProps) {
  const progress = percentageOf(goal.contributedMinor, goal.targetMinor);
  const isComplete = goal.contributedMinor >= goal.targetMinor;

  return (
    <View
      accessible
      accessibilityLabel={`${goal.name}: ${formatMoney(goal.contributedMinor)} of ${formatMoney(
        goal.targetMinor
      )} saved`}
      style={styles.row}
    >
      <View style={styles.iconWrap}>
        <Icon name="target" size={17} color={isComplete ? 'income' : 'primary'} />
      </View>

      <View style={styles.details}>
        <View style={styles.topRow}>
          <AppText numberOfLines={1} variant="bodyStrong" style={styles.name}>
            {goal.name}
          </AppText>
          <AppText variant="captionStrong" color={isComplete ? 'income' : 'textSecondary'}>
            {progress}%
          </AppText>
        </View>

        <AppText numberOfLines={1} variant="caption" color="textMuted">
          {formatMoney(goal.contributedMinor)} of {formatMoney(goal.targetMinor)}
        </AppText>

        <ProgressBar progress={progress} tone={isComplete ? 'income' : 'primary'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 32,
    justifyContent: 'center',
    marginTop: 2,
    width: 32,
  },
  details: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
});
