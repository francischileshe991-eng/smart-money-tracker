import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

import { colors, radii, spacing } from '@/theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: IconName;
  trailingText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  hint,
  error,
  leadingIcon,
  trailingText,
  containerStyle,
  style,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

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
          multiline && styles.multilineField,
          focused && styles.focused,
          error ? styles.errored : null,
        ]}
      >
        {leadingIcon ? <Icon name={leadingIcon} size={18} color="textMuted" /> : null}

        <TextInput
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
          style={[styles.input, multiline && styles.multilineInput, style]}
        />

        {trailingText ? (
          <AppText variant="captionStrong" color="textMuted">
            {trailingText}
          </AppText>
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" color="expense">
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
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
  focused: {
    borderColor: colors.primary,
  },
  errored: {
    borderColor: colors.expense,
  },
  input: {
    color: colors.text,
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
