import { useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/components/transactions/transaction-form';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import type { TransactionType } from '@/types/finance';

function initialTypeFromParam(value: string | undefined): TransactionType {
  if (value === 'income' || value === 'transfer') {
    return value;
  }

  return 'expense';
}

export default function AddTransactionScreen() {
  const { type, fromAccountId } = useLocalSearchParams<{ type?: string; fromAccountId?: string }>();
  const initialType = initialTypeFromParam(type);

  return (
    <Screen>
      <ScreenHeader
        title="Add transaction"
      />
      <TransactionForm
        initialFromAccountId={fromAccountId}
        initialType={initialType}
        key={`${initialType}:${fromAccountId ?? ''}`}
      />
    </Screen>
  );
}
