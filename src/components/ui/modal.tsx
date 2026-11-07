import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { Icon } from './icon';

import { colors, radii, shadows, spacing } from '@/theme';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** Use for dialogs with long content that may exceed small screens. */
  scrollable?: boolean;
};

export function Modal({
  visible,
  onClose,
  title,
  description,
  children,
  actions,
  scrollable = false,
}: ModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <RNModal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText variant="h2">{title}</AppText>
                {description ? (
                  <AppText variant="body" color="textSecondary">
                    {description}
                  </AppText>
                ) : null}
              </View>

              <Pressable
                accessibilityLabel="Close dialog"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={styles.closeButton}
              >
                <Icon name="close" size={18} color="textSecondary" />
              </Pressable>
            </View>

            {children ? (
              scrollable ? (
                <ScrollView
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={styles.scrollContent}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.content}>{children}</View>
              )
            ) : null}

            {actions ? <View style={styles.actions}>{actions}</View> : null}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
  wrapper: {
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    maxHeight: '88%',
    maxWidth: 520,
    padding: spacing.xl,
    width: '100%',
    ...shadows.sheet,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  scrollContent: {
    flexShrink: 1,
  },
  content: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
});
