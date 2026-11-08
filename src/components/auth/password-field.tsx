import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { TextField, type TextFieldProps } from '@/components/ui/text-field';

type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'trailingAction' | 'trailingText'>;

export function PasswordField({ label = 'Password', editable = true, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return <TextField
    {...props}
    label={label}
    editable={editable}
    secureTextEntry={!visible}
    autoCapitalize="none"
    autoCorrect={false}
    trailingAction={
      <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        accessibilityState={{ disabled: !editable }} disabled={!editable}
        onPress={() => setVisible((value) => !value)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <AppText variant="link" color="primary">{visible ? 'Hide' : 'Show'}</AppText>
      </Pressable>
    }
  />;
}

const styles = StyleSheet.create({
  toggle: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
});
