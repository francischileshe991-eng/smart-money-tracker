import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { TextField } from '@/components/ui/text-field';
import { categoriesFor } from '@/data/categories';
import { useAuth } from '@/providers/auth-provider';
import { useFinance } from '@/providers/finance-provider';
import { spacing, useThemeColors } from '@/theme';
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
import { formatTransactionDate, todayIso } from '@/utils/date';
import { preferredAccountId, quickCategories } from '@/utils/transaction-shortcuts';
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

const TYPE_OPTIONS: { label: string; value: TransactionType }[] =
  [
    { label: 'Expense', value: 'expense' },
    { label: 'Income', value: 'income' },
    { label: 'Transfer', value: 'transfer' },
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
  const colors = useThemeColors();
  const { accounts, allAccounts, transactions, addTransaction, updateTransaction } = useFinance();
  const { user } = useAuth();
  const accountTouched = useRef(false);
  const preferenceKey = user ? `smart-money-tracker:last-transaction-account:${user.id}` : null;
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
  const [showAllCategories, setShowAllCategories] = useState(mode === 'edit');
  const [showDetails, setShowDetails] = useState(mode === 'edit');

  useEffect(() => {
    if (mode !== 'create' || !preferenceKey) return;
    let active = true;
    void AsyncStorage.getItem(preferenceKey).then((rememberedId) => {
      if (!active || accountTouched.current) return;
      setAccountId(preferredAccountId(accounts, rememberedId));
      const sourceId = preferredAccountId(accounts, rememberedId, initialFromAccountId);
      setFromAccountId(sourceId);
      setToAccountId(accounts.find((account) => account.id !== sourceId)?.id ?? '');
    }).catch(() => {});
    return () => { active = false; };
  }, [accounts, initialFromAccountId, mode, preferenceKey]);

  const suggestedCategories = useMemo(
    () => type === 'transfer' ? [] : quickCategories(transactions, type, categoriesFor(type)),
    [transactions, type]
  );

  const categories = type === 'transfer' ? [] : categoriesFor(type);
  const visibleCategories = showAllCategories ? categories
    : suggestedCategories.includes(category) ? suggestedCategories : [...suggestedCategories, category];
  const selectedAccount = accountOptions.find(
    (account) => account.id === (type === 'transfer' ? fromAccountId : accountId)
  );

  function selectType(nextType: TransactionType) {
    if (nextType === type) return;
    setType(nextType);
    setErrors({});
    setSubmissionError(undefined);
    setShowAllCategories(mode === 'edit');

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
    setShowDetails(false);
    setErrors({});
  }

  function handleSubmit() {
    setSubmissionError(undefined);

    const result = validateTransactionInput({
      type,
      amount,
      title: title.trim() || (type === 'transfer' ? 'Account transfer' : category),
      category,
      date,
      accountId,
      fromAccountId,
      toAccountId,
      accountIds: accountOptions.map((account) => account.id),
    });

    setErrors(result.errors);

    if (Object.keys(result.errors).length > 0 || result.amountMinor === null) {
      if (result.errors.date || result.errors.title) setShowDetails(true);
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
      accountTouched.current = true;
      if (preferenceKey) {
        // Preferences are optional; a storage failure must not undo a valid transaction.
        void AsyncStorage.setItem(preferenceKey, type === 'transfer' ? fromAccountId : accountId).catch(() => {});
      }
    }

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

  if (mode === 'create' && accounts.length === 0) {
    return <Card><EmptyState icon="wallet" title="Add an account first"
      message="Choose where your money is kept before recording a transaction."
      action={<Button label="Set up an account" icon="add" onPress={() => router.navigate('/accounts')} />} /></Card>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <TextField
          error={errors.amount}
          keyboardType="decimal-pad"
          label="Amount"
          onChangeText={setAmount}
          placeholder="0.00"
          trailingText="ZMW"
          value={amount}
          style={styles.amountInput}
          variant="underlined"
        />
        <View style={styles.fieldGroup}>
          <View style={[styles.typeTabs, { borderBottomColor: colors.border }]}>
            {TYPE_OPTIONS.map((option) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: type === option.value }}
                key={option.value}
                onPress={() => selectType(option.value)}
                style={({ pressed }) => [styles.typeTab,
                  { borderBottomColor: type === option.value ? colors.text : 'transparent' },
                  pressed && { opacity: 0.6 }]}
              >
                <AppText variant={type === option.value ? 'bodyStrong' : 'body'}
                  color={type === option.value ? 'text' : 'textSecondary'}>{option.label}</AppText>
              </Pressable>
            ))}
          </View>
          {type === 'transfer' ? (
            <AppText variant="caption" color="textMuted">
              Transfers move money between accounts and never count as income or expenses.
            </AppText>
          ) : null}
        </View>

        {type !== 'transfer' ? (
          <View style={styles.fieldGroup}>
            <AppText variant="label" color="textSecondary">
              Category
            </AppText>
            <View style={styles.chipRow}>
              {visibleCategories.map((option) => (
                <Chip
                  active={category === option}
                  key={option}
                  label={option}
                  onPress={() => setCategory(option)}
                />
              ))}
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAllCategories }}
              onPress={() => setShowAllCategories((expanded) => !expanded)} style={styles.textAction}>
              <AppText variant="link" color="primary">{showAllCategories ? 'Show less' : 'All categories'}</AppText>
            </Pressable>
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
              onSelect={(id) => {
                accountTouched.current = true;
                setFromAccountId(id);
                if (id === toAccountId) setToAccountId(accountOptions.find((account) => account.id !== id)?.id ?? '');
              }}
              selectedId={fromAccountId}
            />
            <AccountChips
              accounts={accountOptions}
              error={errors.toAccount}
              label="To account"
              onSelect={(id) => { accountTouched.current = true; setToAccountId(id); }}
              selectedId={toAccountId}
            />
          </>
        ) : (
          <AccountChips
            accounts={accountOptions}
            error={errors.account}
            hint={selectedAccount ? `${formatMoney(selectedAccount.balanceMinor)} available` : undefined}
            label="Account"
            onSelect={(id) => { accountTouched.current = true; setAccountId(id); }}
            selectedId={accountId}
          />
        )}

        <Button label={showDetails ? 'Hide details' : `${formatTransactionDate(date)} · Add details`}
          variant="ghost" size="sm"
          accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails((expanded) => !expanded)} />
        {showDetails ? <>
          <TextField error={errors.title} label="Description (optional)" maxLength={60}
            onChangeText={setTitle} placeholder={type === 'transfer' ? 'Account transfer' : category} value={title} />
          <DateField error={errors.date} label="Date" onChange={setDate} value={date} />
          <TextField label="Note (optional)" multiline onChangeText={setNote}
            placeholder="Add context for this transaction" value={note} />
        </> : null}
        {type === 'transfer' && accountOptions.length < 2 ?
          <Button label="Add another account to transfer" variant="secondary" onPress={() => router.navigate('/accounts/manage')} /> : null}
      </View>

      <Button
        fullWidth
        disabled={mode === 'create' && type === 'transfer' && accountOptions.length < 2}
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
    gap: spacing.xxl,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: '400',
    lineHeight: 56,
    minHeight: 80,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  typeTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  typeTab: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center', borderBottomWidth: 2 },
  textAction: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
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
