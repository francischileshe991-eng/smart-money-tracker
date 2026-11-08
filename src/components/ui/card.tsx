import { StyleSheet, View, type ViewProps } from 'react-native';

import { radii, shadows, spacing, useThemeColors } from '@/theme';

export type CardTone = 'surface' | 'primary' | 'muted';

export type CardProps = ViewProps & {
  tone?: CardTone;
  padded?: boolean;
};

export function Card({ tone = 'surface', padded = true, style, ...rest }: CardProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.surface, borderColor: colors.border },
        padded && styles.padded,
        tone === 'primary' && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
        tone === 'muted' && { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt },
        tone === 'muted' && styles.muted,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
  muted: {
    shadowOpacity: 0,
    elevation: 0,
  },
});
