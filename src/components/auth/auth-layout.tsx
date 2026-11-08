import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { spacing } from '@/theme';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <Screen keyboardAware contentContainerStyle={styles.screen}>
    <View style={styles.content}>
      <View style={styles.brand}>
        <AppText variant="bodyStrong">Smart Money Tracker</AppText>
        <AppText color="textSecondary">Your money. Made clear.</AppText>
      </View>
      <ScreenHeader title={title} subtitle={subtitle} />
      <View style={styles.form}>{children}</View>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { maxWidth: 460, paddingBottom: spacing.huge },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  brand: { gap: spacing.xs, marginBottom: spacing.huge },
  form: { gap: spacing.xl },
});
