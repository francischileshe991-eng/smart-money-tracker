import { Text, type TextProps } from 'react-native';

import { colors, textStyles, type ColorName, type TextVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ColorName;
};

export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  return <Text style={[textStyles[variant], { color: colors[color] }, style]} {...rest} />;
}
