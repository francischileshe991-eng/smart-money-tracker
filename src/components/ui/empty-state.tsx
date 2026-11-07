import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

import { colors, spacing } from '@/theme';

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ icon = 'transactions', title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={26} color="textMuted" />
      </View>
      <AppText variant="h3" style={styles.centerText}>
        {title}
      </AppText>
      <AppText variant="body" color="textSecondary" style={styles.centerText}>
        {message}
      </AppText>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.huge,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 52,
  },
  centerText: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.lg,
  },
});
