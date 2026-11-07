import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Card } from './card';
import { Icon, type IconName } from './icon';

import { colors, radii, spacing } from '@/theme';

type StatCardProps = {
  label: string;
  value: string;
  caption?: string;
  icon: IconName;
  tone: 'income' | 'expense';
};

export function StatCard({ label, value, caption, icon, tone }: StatCardProps) {
  const toneColor = tone === 'income' ? colors.income : colors.expense;
  const toneBackground = tone === 'income' ? colors.incomeSoft : colors.expenseSoft;

  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: toneBackground }]}>
        <Icon name={icon} size={18} color={tone} />
      </View>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
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
  iconWrap: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 34,
  },
});
