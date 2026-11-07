import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme';

export type CardTone = 'surface' | 'primary' | 'muted';

export type CardProps = ViewProps & {
  tone?: CardTone;
  padded?: boolean;
};

export function Card({ tone = 'surface', padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        tone === 'primary' && styles.primary,
        tone === 'muted' && styles.muted,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  muted: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
  },
});
