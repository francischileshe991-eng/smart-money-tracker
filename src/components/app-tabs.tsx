import { NativeTabs } from 'expo-router/native-tabs';

import { ICONS } from '@/components/ui/icon';
import { APP_TABS } from '@/navigation/tabs';
import { useThemeColors } from '@/theme';

export default function AppTabs() {
  const colors = useThemeColors();
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      iconColor={{ default: colors.textMuted, selected: colors.primary }}
      indicatorColor={colors.primarySoft}
      labelStyle={{
        default: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
        selected: { color: colors.primary, fontSize: 11, fontWeight: '700' },
      }}
      tintColor={colors.primary}
    >
      {APP_TABS.map((tab) => {
        const icon = ICONS[tab.icon];

        return (
          <NativeTabs.Trigger key={tab.name} name={tab.name}>
            <NativeTabs.Trigger.Icon sf={icon.ios} md={icon.android} />
            <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}
