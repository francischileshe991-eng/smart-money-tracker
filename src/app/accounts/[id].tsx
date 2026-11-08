import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TransactionList } from '@/components/transactions/transaction-list';
import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { accountTypeLabel } from '@/data/accounts';
import { useFinance } from '@/providers/finance-provider';
import { spacing } from '@/theme';
import { formatMoney } from '@/utils/currency';
import { transactionReferencesAccount } from '@/utils/finance';

export default function AccountDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    allAccounts,
    archiveAccount,
    deleteAccount,
    restoreAccount,
    transactions,
  } = useFinance();
  const [archiveConfirmation, setArchiveConfirmation] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const account = allAccounts.find((item) => item.id === id);
  const accountTransactions = useMemo(
    () =>
      account
        ? transactions
            .filter((transaction) => transactionReferencesAccount(transaction, account.id))
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [account, transactions]
  );

  if (!account) {
    return (
      <Screen>
        <BackLink />
        <EmptyState
          action={<Button label="Back to accounts" onPress={() => router.dismissTo('/accounts')} />}
          icon="wallet"
          message="This account may have been deleted or reset."
          title="Account not found"
        />
      </Screen>
    );
  }

  const accountId = account.id;

  function confirmArchive() {
    archiveAccount(accountId);
    setArchiveConfirmation(false);
  }

  function confirmDelete() {
    const deleted = deleteAccount(accountId);
    setDeleteConfirmation(false);
    if (deleted) {
      router.dismissTo('/accounts');
    }
  }

  return (
    <Screen>
      <BackLink />
      <ScreenHeader
        right={
          <Button
            label="Edit"
            onPress={() =>
              router.navigate({ pathname: '/accounts/manage', params: { accountId: account.id } })
            }
            size="sm"
            variant="secondary"
          />
        }
        subtitle={`${accountTypeLabel(account.type)}${account.archived ? ' · Archived' : ''}`}
        title={account.name}
      />

      <Card style={styles.balanceCard} tone={account.archived ? 'muted' : 'primary'}>
        <AppText variant="label" color={account.archived ? 'textMuted' : 'primaryMuted'}>
          {account.archived ? 'ARCHIVED BALANCE' : 'CURRENT BALANCE'}
        </AppText>
        <AppText
          variant="display"
          color={account.archived ? 'text' : 'textInverse'}
          numberOfLines={1}
        >
          {formatMoney(account.balanceMinor)}
        </AppText>
        <AppText variant="caption" color={account.archived ? 'textSecondary' : 'primaryMuted'}>
          Opening balance {formatMoney(account.openingBalanceMinor)}
        </AppText>
      </Card>

      <View style={styles.actions}>
        {account.archived ? (
          <Button
            fullWidth
            icon="reset"
            label="Restore account"
            onPress={() => restoreAccount(account.id)}
          />
        ) : (
          <>
            <Button
              fullWidth
              icon="transfer"
              label="Transfer"
              onPress={() =>
                router.navigate({
                  pathname: '/add',
                  params: { type: 'transfer', fromAccountId: account.id },
                })
              }
            />
            <Button
              fullWidth
              label="Archive"
              onPress={() => setArchiveConfirmation(true)}
              variant="secondary"
            />
          </>
        )}
      </View>

      {accountTransactions.length === 0 ? (
        <View style={styles.deleteSection}>
          <Button
            fullWidth
            icon="delete"
            label="Delete account"
            onPress={() => setDeleteConfirmation(true)}
            variant="danger"
          />
        </View>
      ) : (
        <AppText variant="caption" color="textMuted" style={styles.protectionNote}>
          This account has {accountTransactions.length}{' '}
          {accountTransactions.length === 1 ? 'transaction' : 'transactions'} and cannot be deleted.
          Archive it to keep its history.
        </AppText>
      )}

      <SectionHeader title={`History · ${accountTransactions.length}`} />
      <TransactionList
        emptyMessage="Transactions and transfers involving this account will appear here."
        emptyTitle="No account activity yet"
        transactions={accountTransactions}
        onSelect={(transaction) =>
          router.navigate({ pathname: '/transaction/[id]', params: { id: transaction.id } })
        }
      />

      <Modal
        actions={
          <>
            <Button
              label="Cancel"
              onPress={() => setArchiveConfirmation(false)}
              style={styles.modalAction}
              variant="secondary"
            />
            <Button
              label="Archive"
              onPress={confirmArchive}
              style={styles.modalAction}
            />
          </>
        }
        description="This account will no longer be included in the active total or available for new transactions. Its balance and transaction history will be kept."
        onClose={() => setArchiveConfirmation(false)}
        title="Archive this account?"
        visible={archiveConfirmation}
      />

      <Modal
        actions={
          <>
            <Button
              label="Cancel"
              onPress={() => setDeleteConfirmation(false)}
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
        description="This account has no transaction history. Deleting it permanently removes its opening balance."
        onClose={() => setDeleteConfirmation(false)}
        title="Delete account?"
        visible={deleteConfirmation}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    gap: spacing.sm,
    padding: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteSection: {
    marginTop: spacing.lg,
  },
  protectionNote: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  modalAction: {
    flex: 1,
  },
});
