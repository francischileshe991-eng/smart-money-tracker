import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { Icon } from './icon';

import { spacing } from '@/theme';

type BackLinkProps = {
  label?: string;
  onPress?: () => void;
};

/** Consistent in-content back navigation for screens presented over the tabs. */
export function BackLink({ label = 'Back', onPress }: BackLinkProps) {
  function handlePress() {
    if (onPress) {
      onPress();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Icon name="back" size={16} color="primary" />
      <AppText variant="link" color="primary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.65,
  },
});
