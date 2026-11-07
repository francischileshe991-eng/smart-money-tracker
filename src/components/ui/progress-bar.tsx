import { StyleSheet, View, type DimensionValue } from 'react-native';

import { colors, radii } from '@/theme';

export type ProgressTone = 'primary' | 'income' | 'warning' | 'expense';

const TONE_COLORS: Record<ProgressTone, string> = {
  primary: colors.primary,
  income: colors.income,
  warning: colors.warning,
  expense: colors.expense,
};

type ProgressBarProps = {
  /** Visual percentage from 0 to 100. */
  progress: number;
  tone?: ProgressTone;
};

export function ProgressBar({ progress, tone = 'primary' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={styles.track}
    >
      <View
        style={[
          styles.fill,
          { backgroundColor: TONE_COLORS[tone], width: `${clamped}%` as DimensionValue },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radii.pill,
    height: '100%',
  },
});
