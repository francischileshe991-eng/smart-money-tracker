import { View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { Icon } from '@/components/ui/icon';
import { radii, useThemeColors } from '@/theme';

export const PROFILE_ICON_OPTIONS = [
  { id: 'profile', label: 'Classic', icon: 'profile' },
  { id: 'profile-man', label: 'Circle', icon: 'profileCircle' },
  { id: 'profile-girl', label: 'Badge', icon: 'profileBadge' },
  { id: 'smile', label: 'Smile', icon: 'avatarSmile' },
  { id: 'paw', label: 'Paw', icon: 'avatarPaw' },
  { id: 'rabbit', label: 'Rabbit', icon: 'avatarRabbit' },
  { id: 'leaf', label: 'Leaf', icon: 'avatarLeaf' },
  { id: 'flower', label: 'Flower', icon: 'avatarFlower' },
  { id: 'sun', label: 'Sun', icon: 'lightMode' },
  { id: 'moon', label: 'Moon', icon: 'darkMode' },
  { id: 'star', label: 'Star', icon: 'avatarStar' },
  { id: 'heart', label: 'Heart', icon: 'avatarHeart' },
  { id: 'mountain', label: 'Mountain', icon: 'avatarMountain' },
  { id: 'travel', label: 'Travel', icon: 'avatarTravel' },
  { id: 'music', label: 'Music', icon: 'avatarMusic' },
] as const;

export type ProfileIconId = (typeof PROFILE_ICON_OPTIONS)[number]['id'];

export function ProfileAvatar({ name, size }: { name: string; size: number }) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const iconId = user?.user_metadata?.profile_icon;
  const selected = PROFILE_ICON_OPTIONS.find((option) => option.id === iconId) ?? PROFILE_ICON_OPTIONS[0];
  return (
    <View
      accessibilityLabel={`${name}'s ${selected.label.toLowerCase()} profile icon`}
      style={{
        alignItems: 'center',
        backgroundColor: colors.primarySoft,
        borderRadius: radii.pill,
        height: size,
        justifyContent: 'center',
        overflow: 'hidden',
        width: size,
      }}
    >
      <Icon name={selected.icon} size={size * 0.62} color="primary" />
    </View>
  );
}
