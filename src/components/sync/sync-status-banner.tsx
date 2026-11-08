import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFinance } from '@/providers/finance-provider';
import { spacing, useThemeColors } from '@/theme';

/**
 * Surfaces sync states that need the user's attention. Normal syncing and
 * successful syncs stay out of the way; the Profile screen always shows the
 * full status.
 */
export function SyncStatusBanner() {
  const colors = useThemeColors();
  const { pendingChanges, resolveConflict, retrySync, syncError, syncStatus } = useFinance();

  if (syncStatus !== 'offline' && syncStatus !== 'error' && syncStatus !== 'conflict') {
    return null;
  }

  const isConflict = syncStatus === 'conflict';
  const isError = syncStatus === 'error';
  const title = isConflict ? 'Sync conflict' : isError ? 'Sync failed' : 'Offline';
  const description = isConflict
    ? 'This account was updated on another device. Choose which copy to keep.'
    : isError
      ? syncError ?? 'Your changes are saved on this device and will retry automatically.'
      : pendingChanges
        ? `${syncError ? `${syncError} ` : ''}Your changes are saved on this device and will sync when you are back online.`
        : `${syncError ? `${syncError} ` : ''}Showing the data saved on this device. New changes will sync when you are back online.`;

  return (
    <Card
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        isConflict && { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
        isError && { backgroundColor: colors.expenseSoft, borderColor: colors.expenseSoft },
      ]}
      tone={isConflict || isError ? 'surface' : 'muted'}
    >
      <View style={styles.text}>
        <AppText
          variant="captionStrong"
          color={isConflict ? 'warning' : isError ? 'expense' : 'textSecondary'}
        >
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {description}
        </AppText>
      </View>

      {isConflict ? (
        <View style={styles.actions}>
          <Button
            label="Use cloud data"
            onPress={() => void resolveConflict('use-cloud')}
            size="sm"
            style={styles.action}
            variant="secondary"
          />
          <Button
            label="Keep my changes"
            onPress={() => void resolveConflict('keep-local')}
            size="sm"
            style={styles.action}
          />
        </View>
      ) : (
        <Button label="Retry" onPress={retrySync} size="sm" variant="secondary" />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  text: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
