import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Card } from './card';
import { Icon, type IconName } from './icon';

import { spacing, useThemeColors } from '@/theme';

type StatCardProps = {
  label: string;
  value: string;
  caption?: string;
  icon: IconName;
  tone: 'income' | 'expense';
};

export function StatCard({ label, value, caption, icon, tone }: StatCardProps) {
  const colors = useThemeColors();
  const toneColor = tone === 'income' ? colors.income : colors.expense;

  return (
    <Card style={styles.card}>
      <View style={styles.labelRow}>
        <Icon name={icon} size={15} color="textSecondary" />
        <AppText variant="caption" color="textSecondary">{label}</AppText>
      </View>
      <AppText variant="amountSmall" style={{ color: toneColor }}>
        {value}
      </AppText>
      {caption ? (
        <AppText variant="caption" color="textMuted">
          {caption}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
