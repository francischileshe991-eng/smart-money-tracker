import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { type ReactNode, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { APP_TABS } from '@/navigation/tabs';
import { colors, layout, radii, spacing } from '@/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          {APP_TABS.map((tab) => (
            <TabTrigger key={tab.name} asChild href={tab.href} name={tab.name}>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: IconName;
  children?: ReactNode;
};

function TabButton({ children, isFocused, ref, icon, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      // `TabTriggerSlotProps` types its ref as `Ref<View>` (the component type),
      // while `Pressable` expects a ref to its host instance.
      ref={ref as unknown as Ref<PressableInstance>}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
    >
      <Icon
        name={icon}
        size={22}
        color={isFocused ? 'primary' : 'textMuted'}
        weight={isFocused ? 'semibold' : 'regular'}
      />
      <AppText variant="captionStrong" color={isFocused ? 'primary' : 'textMuted'}>
        {children}
      </AppText>
    </Pressable>
  );
}

function CustomTabList({ children, style, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        style,
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
  },
  inner: {
    alignSelf: 'center',
    flexDirection: 'row',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: radii.md,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.65,
  },
});
