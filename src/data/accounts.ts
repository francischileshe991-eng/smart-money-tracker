import type { AccountType } from '@/types/finance';
import type { IconName } from '@/components/ui/icon';

export const ACCOUNT_TYPE_OPTIONS: {
  label: string;
  type: AccountType;
  icon: IconName;
}[] = [
  { label: 'Cash', type: 'cash', icon: 'cash' },
  { label: 'Bank account', type: 'bank', icon: 'account' },
  { label: 'MTN Mobile Money', type: 'mtn_money', icon: 'mobileMoney' },
  { label: 'Airtel Money', type: 'airtel_money', icon: 'mobileMoney' },
  { label: 'Other', type: 'other', icon: 'wallet' },
];

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_OPTIONS.find((option) => option.type === type)?.label ?? 'Other';
}
