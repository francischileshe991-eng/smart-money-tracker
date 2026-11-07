import type { Href } from 'expo-router';

import type { IconName } from '@/components/ui/icon';

export type AppTabConfig = {
  name: string;
  href: Href;
  label: string;
  icon: IconName;
};

export const APP_TABS: readonly AppTabConfig[] = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  {
    name: 'transactions',
    href: '/transactions',
    label: 'Transactions',
    icon: 'transactions',
  },
  { name: 'add', href: '/add', label: 'Add', icon: 'add' },
  { name: 'budgets', href: '/budgets', label: 'Budgets', icon: 'budgets' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'profile' },
];
