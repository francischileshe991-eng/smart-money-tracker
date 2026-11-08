import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

import { radii, spacing, type ColorName, useThemeColors } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

type ButtonVariantConfig = {
  backgroundColor: ColorName;
  textColor: ColorName;
  borderColor: ColorName;
};

const VARIANTS: Record<ButtonVariant, ButtonVariantConfig> = {
  primary: {
    backgroundColor: 'surface',
    textColor: 'text',
    borderColor: 'borderStrong',
  },
  secondary: {
    backgroundColor: 'surface',
    textColor: 'text',
    borderColor: 'borderStrong',
  },
  ghost: {
    backgroundColor: 'surface',
    textColor: 'primary',
    borderColor: 'border',
  },
  outline: {
    backgroundColor: 'surface',
    textColor: 'text',
    borderColor: 'borderStrong',
  },
  danger: {
    backgroundColor: 'surface',
    textColor: 'expense',
    borderColor: 'expense',
  },
};

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'outline',
  size = 'md',
  icon,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const colors = useThemeColors();
  const config = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: colors[config.backgroundColor],
          borderColor: colors[config.borderColor],
        },
        variant === 'ghost' && { backgroundColor: 'transparent', borderColor: 'transparent' },
        variant !== 'ghost' && { backgroundColor: 'transparent' },
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={config.textColor} /> : null}
      <AppText variant={variant === 'ghost' ? 'link' : size === 'sm' ? 'captionStrong' : 'button'} color={config.textColor}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  md: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sm: {
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
