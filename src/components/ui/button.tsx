import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

import { colors, radii, spacing, type ColorName } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

type ButtonVariantConfig = {
  backgroundColor: ColorName;
  textColor: ColorName;
  borderColor: ColorName;
};

const VARIANTS: Record<ButtonVariant, ButtonVariantConfig> = {
  primary: {
    backgroundColor: 'primary',
    textColor: 'textInverse',
    borderColor: 'primary',
  },
  secondary: {
    backgroundColor: 'primarySoft',
    textColor: 'primary',
    borderColor: 'primarySoft',
  },
  ghost: {
    backgroundColor: 'surface',
    textColor: 'text',
    borderColor: 'border',
  },
  danger: {
    backgroundColor: 'expenseSoft',
    textColor: 'expense',
    borderColor: 'expenseSoft',
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
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
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
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={config.textColor} /> : null}
      <AppText variant={size === 'sm' ? 'captionStrong' : 'button'} color={config.textColor}>
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
