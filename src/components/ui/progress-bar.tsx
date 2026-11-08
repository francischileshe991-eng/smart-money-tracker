import { StyleSheet, View, type DimensionValue } from 'react-native';

import { radii, useThemeColors } from '@/theme';

export type ProgressTone = 'primary' | 'income' | 'mint' | 'warning' | 'expense';

type ProgressBarProps = {
  /** Visual percentage from 0 to 100. */
  progress: number;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
};

export function ProgressBar({ progress, tone = 'primary', size = 'md' }: ProgressBarProps) {
  const colors = useThemeColors();
  const toneColors: Record<ProgressTone, string> = {
    primary: colors.primary,
    income: colors.income,
    mint: colors.mintGreen,
    warning: colors.warning,
    expense: colors.expense,
  };
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.track, { backgroundColor: colors.surfaceAlt }, size === 'sm' && styles.small]}
    >
      <View
        style={[
          styles.fill,
          { backgroundColor: toneColors[tone], width: `${clamped}%` as DimensionValue },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radii.pill,
    height: '100%',
  },
  small: { height: 3 },
});
