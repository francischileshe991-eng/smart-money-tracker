import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { Icon } from './icon';

import { radii, shadows, spacing, useThemeColors } from '@/theme';

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
  scrollable = true,
}: ModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { height: windowHeight } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, spacing.xxl);
  const maxSheetHeight = Math.max(0, windowHeight - insets.top - bottomInset - spacing.lg);

  return (
    <RNModal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.wrapper, { maxHeight: maxSheetHeight + bottomInset, paddingBottom: bottomInset }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: maxSheetHeight }]}>
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
                style={[styles.closeButton, { backgroundColor: colors.surfaceAlt }]}
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
    flex: 1,
    justifyContent: 'flex-end',
  },
  wrapper: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  sheet: {
    alignSelf: 'center',
    borderRadius: radii.xl,
    maxWidth: 520,
    overflow: 'hidden',
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
    minWidth: 0,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  scrollContent: {
    flexShrink: 1,
    minHeight: 0,
  },
  content: {
    gap: spacing.md,
    marginTop: spacing.lg,
    minWidth: 0,
    paddingBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    maxWidth: '100%',
  },
});
