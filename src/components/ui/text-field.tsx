import { useState, type ReactNode, type Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextInputInstance,
  type ViewStyle,
} from 'react-native';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

import { radii, spacing, useThemeColors } from '@/theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: IconName;
  trailingText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  variant?: 'outlined' | 'underlined';
  inputRef?: Ref<TextInputInstance>;
  trailingAction?: ReactNode;
};

export function TextField({
  label,
  hint,
  error,
  leadingIcon,
  trailingText,
  containerStyle,
  variant = 'outlined',
  inputRef,
  trailingAction,
  style,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const colors = useThemeColors();

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText variant="label" color="textSecondary">
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.field,
          { backgroundColor: colors.surface, borderColor: colors.border },
          variant === 'underlined' && styles.underlined,
          multiline && styles.multilineField,
          focused && { borderColor: colors.primary },
          error ? { borderColor: colors.expense } : null,
        ]}
      >
        {leadingIcon ? <Icon name={leadingIcon} size={18} color="textMuted" /> : null}

        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          {...rest}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, { color: colors.text }, multiline && styles.multilineInput, style]}
        />

        {trailingText ? (
          <AppText variant="captionStrong" color="textMuted">
            {trailingText}
          </AppText>
        ) : null}
        {trailingAction}
      </View>

      {error ? (
        <AppText variant="caption" color="expense" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  field: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  multilineField: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  underlined: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingHorizontal: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 44,
    paddingVertical: 0,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
