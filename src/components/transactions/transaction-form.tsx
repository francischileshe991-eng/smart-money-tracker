import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Modal } from '@/components/ui/modal';
import { TextField } from '@/components/ui/text-field';
import { categoriesFor } from '@/data/categories';
import { useFinance } from '@/providers/finance-provider';
import { spacing } from '@/theme';
import type {
  AccountWithBalance,
  Category,
  ExpenseCategory,
  IncomeCategory,
  NewTransaction,
  Transaction,
  TransactionType,
} from '@/types/finance';
import { formatAmountInput, formatMoney } from '@/utils/currency';
import { transactionReferencesAccount } from '@/utils/finance';
import { todayIso } from '@/utils/date';
import {
  validateTransactionInput,
  type TransactionValidationErrors,
} from '@/utils/transaction-validation';

type SavedTransaction = {
  amountMinor: number;
  type: TransactionType;
};

type TransactionFormProps = {
  mode?: 'create' | 'edit';
  initialType?: TransactionType;
  /** Pre-selects the source account when starting a transfer from an account. */
  initialFromAccountId?: string;
  transaction?: Transaction;
};

const TYPE_OPTIONS: { label: string; value: TransactionType; tone: 'expense' | 'income' | 'default' }[] =
  [
    { label: 'Expense', value: 'expense', tone: 'expense' },
    { label: 'Income', value: 'income', tone: 'income' },
    { label: 'Transfer', value: 'transfer', tone: 'default' },
  ];

function categoryForType(type: TransactionType): Category {
  return type === 'transfer' ? categoriesFor('expense')[0] : categoriesFor(type)[0];
}

type AccountChipsProps = {
  label: string;
  accounts: AccountWithBalance[];
  selectedId: string;
  onSelect: (accountId: string) => void;
  error?: string;
  hint?: string;
};

function AccountChips({ label, accounts, selectedId, onSelect, error, hint }: AccountChipsProps) {
  return (
    <View style={styles.fieldGroup}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.chipRow}>
        {accounts.map((account) => (
          <Chip
            active={selectedId === account.id}
            key={account.id}
            label={account.name}
            onPress={() => onSelect(account.id)}
          />
        ))}
      </View>
      {error ? (
        <AppText variant="caption" color="expense">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function TransactionForm({
  mode = 'create',
  initialType = 'expense',
  initialFromAccountId,
  transaction,
}: TransactionFormProps) {
  const { accounts, allAccounts, addTransaction, updateTransaction } = useFinance();
  const resolvedType = transaction?.type ?? initialType;
  const fallbackAccountId = accounts[0]?.id ?? '';
  const accountOptions = transaction
    ? [
        ...accounts,
        ...allAccounts.filter(
          (account) =>
            account.archived && transactionReferencesAccount(transaction, account.id)
        ),
      ]
    : accounts;
  const preferredFromAccountId =
    initialFromAccountId && accountOptions.some((account) => account.id === initialFromAccountId)
      ? initialFromAccountId
      : fallbackAccountId;
  const preferredToAccountId =
    accountOptions.find((account) => account.id !== preferredFromAccountId)?.id ?? '';

  const [type, setType] = useState<TransactionType>(resolvedType);
  const [amount, setAmount] = useState(() =>
    transaction ? formatAmountInput(transaction.amountMinor) : ''
  );
  const [title, setTitle] = useState(transaction?.title ?? '');
  const [category, setCategory] = useState<Category>(() =>
    transaction && transaction.type !== 'transfer'
      ? transaction.category
      : categoryForType(resolvedType)
  );
  const [accountId, setAccountId] = useState(() =>
    transaction && transaction.type !== 'transfer' ? transaction.accountId : fallbackAccountId
  );
  const [fromAccountId, setFromAccountId] = useState(() =>
    transaction?.type === 'transfer' ? transaction.fromAccountId : preferredFromAccountId
  );
  const [toAccountId, setToAccountId] = useState(() =>
    transaction?.type === 'transfer' ? transaction.toAccountId : preferredToAccountId
  );
  const [date, setDate] = useState(transaction?.date ?? todayIso());
  const [note, setNote] = useState(transaction?.note ?? '');
  const [errors, setErrors] = useState<TransactionValidationErrors>({});
  const [saved, setSaved] = useState<SavedTransaction | null>(null);
  const [submissionError, setSubmissionError] = useState<string>();

  const categories = type === 'transfer' ? [] : categoriesFor(type);
  const selectedAccount = accountOptions.find(
    (account) => account.id === (type === 'transfer' ? fromAccountId : accountId)
  );

  function selectType(nextType: TransactionType) {
    setType(nextType);
    setErrors({});
    setSubmissionError(undefined);

    if (nextType !== 'transfer') {
      setCategory(categoriesFor(nextType)[0]);
      return;
    }

    if (fromAccountId === toAccountId) {
      const otherAccount = accountOptions.find((account) => account.id !== fromAccountId);
      setToAccountId(otherAccount?.id ?? '');
    }
  }

  function resetForm() {
    setAmount('');
    setTitle('');
    setNote('');
    setDate(todayIso());
    setCategory(categoryForType(type));
    setAccountId(accounts[0]?.id ?? '');
    setFromAccountId(preferredFromAccountId);
    setToAccountId(preferredToAccountId);
    setErrors({});
  }

  function handleSubmit() {
    setSubmissionError(undefined);

    const result = validateTransactionInput({
      type,
      amount,
      title,
      category,
      date,
      accountId,
      fromAccountId,
      toAccountId,
      accountIds: accountOptions.map((account) => account.id),
    });

    setErrors(result.errors);

    if (Object.keys(result.errors).length > 0 || result.amountMinor === null) {
      return;
    }

    const amountMinor = result.amountMinor;

    const base = {
      title: result.title,
      amountMinor,
      date,
      note: note.trim() || undefined,
    };

    let payload: NewTransaction;

    if (type === 'transfer') {
      payload = {
        ...base,
        type: 'transfer',
        fromAccountId,
        toAccountId,
      };
    } else if (type === 'income') {
      payload = {
        ...base,
        type: 'income',
        category: category as IncomeCategory,
        accountId,
      };
    } else {
      payload = {
        ...base,
        type: 'expense',
        category: category as ExpenseCategory,
        accountId,
      };
    }

    const accepted =
      mode === 'edit' && transaction
        ? updateTransaction(transaction.id, payload)
        : addTransaction(payload);

    if (!accepted) {
      setSubmissionError(
        'Choose an available account for this transaction and different accounts for a transfer.'
      );
      return;
    }

    setSaved({ amountMinor, type });

    if (mode === 'create') {
      resetForm();
    }
  }

  function leaveAfterSave() {
    setSaved(null);

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/transactions');
  }

  function closeSavedModal() {
    if (mode === 'edit') {
      leaveAfterSave();
      return;
    }

    setSaved(null);
  }

  const savedLabel =
    saved?.type === 'transfer' ? 'Transfer' : saved?.type === 'income' ? 'Income' : 'Expense';
  const actionLabel = mode === 'edit' ? 'Update transaction' : `Save ${type}`;

  return (
    <View style={styles.container}>
      <Card style={styles.formCard}>
        <View style={styles.fieldGroup}>
          <AppText variant="label" color="textSecondary">
            Type
          </AppText>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((option) => (
              <Chip
                active={type === option.value}
                icon={option.value === 'transfer' ? 'transfer' : option.value}
                key={option.value}
                label={option.label}
                onPress={() => selectType(option.value)}
                tone={option.tone}
              />
            ))}
          </View>
          {type === 'transfer' ? (
            <AppText variant="caption" color="textMuted">
              Transfers move money between accounts and never count as income or expenses.
            </AppText>
          ) : null}
        </View>

        <TextField
          error={errors.amount}
          keyboardType="decimal-pad"
          label="Amount"
          onChangeText={setAmount}
          placeholder="0.00"
          trailingText="ZMW"
          value={amount}
        />

        <TextField
          error={errors.title}
          label="Description"
          maxLength={60}
          onChangeText={setTitle}
          placeholder={
            type === 'transfer'
              ? 'e.g. Move money to mobile money'
              : type === 'income'
                ? 'e.g. Monthly salary'
                : 'e.g. Weekly groceries'
          }
          value={title}
        />

        {type !== 'transfer' ? (
          <View style={styles.fieldGroup}>
            <AppText variant="label" color="textSecondary">
              Category
            </AppText>
            <View style={styles.chipRow}>
              {categories.map((option) => (
                <Chip
                  active={category === option}
                  key={option}
                  label={option}
                  onPress={() => setCategory(option)}
                />
              ))}
            </View>
            {errors.category ? (
              <AppText variant="caption" color="expense">
                {errors.category}
              </AppText>
            ) : null}
          </View>
        ) : null}

        {type === 'transfer' ? (
          <>
            <AccountChips
              accounts={accountOptions}
              error={errors.fromAccount}
              hint={
                selectedAccount
                  ? `${formatMoney(selectedAccount.balanceMinor)} available in ${selectedAccount.name}`
                  : undefined
              }
              label="From account"
              onSelect={setFromAccountId}
              selectedId={fromAccountId}
            />
            <AccountChips
              accounts={accountOptions}
              error={errors.toAccount}
              label="To account"
              onSelect={setToAccountId}
              selectedId={toAccountId}
            />
          </>
        ) : (
          <AccountChips
            accounts={accountOptions}
            error={errors.account}
            hint={selectedAccount ? `${formatMoney(selectedAccount.balanceMinor)} available` : undefined}
            label="Account"
            onSelect={setAccountId}
            selectedId={accountId}
          />
        )}

        <DateField error={errors.date} label="Date" onChange={setDate} value={date} />

        <TextField
          label="Note (optional)"
          multiline
          onChangeText={setNote}
          placeholder="Add context for this transaction"
          value={note}
        />
      </Card>

      <Button
        fullWidth
        icon="check"
        label={actionLabel}
        onPress={handleSubmit}
        style={styles.submitButton}
      />
      {submissionError ? (
        <AppText variant="caption" color="expense">
          {submissionError}
        </AppText>
      ) : null}

      <Modal
        actions={
          mode === 'edit' ? (
            <Button label="Done" onPress={leaveAfterSave} style={styles.modalAction} />
          ) : (
            <>
              <Button
                label="Add another"
                onPress={closeSavedModal}
                style={styles.modalAction}
                variant="secondary"
              />
              <Button
                label="View transactions"
                onPress={() => {
                  setSaved(null);
                  router.navigate('/transactions');
                }}
                style={styles.modalAction}
              />
            </>
          )
        }
        description={
          saved
            ? `${savedLabel} of ${formatMoney(saved.amountMinor)} was ${
                mode === 'edit' ? 'updated' : 'added'
              }.`
            : undefined
        }
        onClose={closeSavedModal}
        title={mode === 'edit' ? 'Transaction updated' : 'Transaction saved'}
        visible={saved !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  formCard: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.xs,
  },
  modalAction: {
    flex: 1,
  },
});
