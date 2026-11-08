import { Text, type TextProps } from 'react-native';

import { textStyles, type ColorName, type TextVariant, useThemeColors } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ColorName;
};

export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const colors = useThemeColors();
  return <Text style={[textStyles[variant], { color: colors[color] }, style]} {...rest} />;
}
