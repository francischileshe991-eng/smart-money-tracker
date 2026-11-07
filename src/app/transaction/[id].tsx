import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { TransactionForm } from '@/components/transactions/transaction-form';
import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useFinance } from '@/providers/finance-provider';
import { spacing } from '@/theme';
import { formatMoney } from '@/utils/currency';
import { formatLongDate } from '@/utils/date';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteTransaction, transactions } = useFinance();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const transaction = transactions.find((item) => item.id === id);

  function leaveScreen() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/transactions');
  }

  function confirmDelete() {
    if (!transaction) {
      return;
    }

    deleteTransaction(transaction.id);
    setDeleteModalVisible(false);
    leaveScreen();
  }

  if (!transaction) {
    return (
      <Screen>
        <BackLink />
        <EmptyState
          action={<Button label="Back to transactions" onPress={leaveScreen} />}
          icon="transactions"
          message="This transaction may have been deleted or reset."
          title="Transaction not found"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink />
      <ScreenHeader
        right={
          <Button
            icon="delete"
            label="Delete"
            onPress={() => setDeleteModalVisible(true)}
            size="sm"
            variant="danger"
          />
        }
        subtitle={`${formatLongDate(transaction.date)} · ${formatMoney(
          transaction.amountMinor
        )}`}
        title="Edit transaction"
      />

      <TransactionForm key={transaction.id} mode="edit" transaction={transaction} />

      <Modal
        actions={
          <>
            <Button
              label="Cancel"
              onPress={() => setDeleteModalVisible(false)}
              style={styles.modalAction}
              variant="secondary"
            />
            <Button
              label="Delete"
              onPress={confirmDelete}
              style={styles.modalAction}
              variant="danger"
            />
          </>
        }
        description={`Delete "${transaction.title}"? Account balances and budget totals will be recalculated. This cannot be undone.`}
        onClose={() => setDeleteModalVisible(false)}
        title="Delete transaction?"
        visible={deleteModalVisible}
      />

      <AppText variant="caption" color="textMuted" style={styles.footerNote}>
        Editing or deleting this transaction updates affected balances immediately.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalAction: {
    flex: 1,
  },
  footerNote: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
