import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { useFinance } from '@/providers/finance-provider';

import { TransactionItem } from './transaction-item';

import { spacing } from '@/theme';
import type { Transaction } from '@/types/finance';
import { transactionAccountLabel } from '@/utils/transaction-query';

type TransactionListProps = {
  transactions: Transaction[];
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onSelect?: (transaction: Transaction) => void;
};

export function TransactionList({
  transactions,
  emptyTitle = 'No transactions yet',
  emptyMessage = 'New income, expenses and transfers will appear here.',
  emptyAction,
  onSelect,
}: TransactionListProps) {
  const { allAccounts } = useFinance();

  if (transactions.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  const accountNames = new Map(allAccounts.map((account) => [account.id, account.name]));

  return (
    <View style={styles.list}>
      {transactions.map((transaction) => (
        <TransactionItem
          accountLabel={transactionAccountLabel(transaction, accountNames)}
          key={transaction.id}
          onPress={onSelect ? () => onSelect(transaction) : undefined}
          transaction={transaction}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
});
