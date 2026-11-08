import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { ACCOUNT_TYPE_OPTIONS } from '@/data/accounts';
import { useFinance } from '@/providers/finance-provider';
import { spacing } from '@/theme';
import type { AccountType, AccountWithBalance, NewAccount } from '@/types/finance';
import { formatAmountInput, parseAmountToMinor } from '@/utils/currency';

export default function ManageAccountScreen() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const { addAccount, allAccounts, updateAccount } = useFinance();
  const account = allAccounts.find((item) => item.id === accountId);

  if (accountId && !account) {
    return (
      <Screen>
        <BackLink />
        <ScreenHeader subtitle="This account is no longer available." title="Account not found" />
        <Button label="Back to accounts" onPress={() => router.dismissTo('/accounts')} />
      </Screen>
    );
  }

  return (
    <AccountForm
      account={account}
      key={accountId ?? 'new'}
      onCreate={addAccount}
      onUpdate={updateAccount}
    />
  );
}

type AccountFormProps = {
  account?: AccountWithBalance;
  onCreate: (account: NewAccount) => void;
  onUpdate: (id: string, account: NewAccount) => void;
};

function AccountForm({ account, onCreate, onUpdate }: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'cash');
  const [openingBalance, setOpeningBalance] = useState(() =>
    formatAmountInput(account?.openingBalanceMinor ?? 0)
  );
  const [nameError, setNameError] = useState<string>();
  const [balanceError, setBalanceError] = useState<string>();

  function handleSave() {
    const trimmedName = name.trim();
    const openingBalanceMinor = parseAmountToMinor(openingBalance);
    setNameError(trimmedName ? undefined : 'Enter a name for this account.');
    setBalanceError(
      openingBalanceMinor === null
        ? 'Enter a valid opening balance, for example 250.00.'
        : undefined
    );

    if (!trimmedName || openingBalanceMinor === null) {
      return;
    }

    const accountValues = { name: trimmedName, type, openingBalanceMinor };

    if (account) {
      onUpdate(account.id, accountValues);
      router.back();
      return;
    }

    onCreate(accountValues);
    // Return to the existing list instead of stacking a duplicate after every save.
    router.dismissTo('/accounts');
  }

  return (
    <Screen>
      <BackLink />
      <ScreenHeader
        subtitle="Your balance is calculated from this opening amount and your account transactions."
        title={account ? 'Edit account' : 'New account'}
      />

      <Card style={styles.formCard}>
        <TextField
          autoCapitalize="words"
          error={nameError}
          label="Account name"
          maxLength={40}
          onChangeText={setName}
          placeholder="e.g. Main bank account"
          value={name}
        />

        <View style={styles.fieldGroup}>
          <AppText variant="label" color="textSecondary">
            Account type
          </AppText>
          <View style={styles.chipRow}>
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <Chip
                active={type === option.type}
                icon={option.icon}
                key={option.type}
                label={option.label}
                onPress={() => setType(option.type)}
              />
            ))}
          </View>
        </View>

        <TextField
          error={balanceError}
          hint="Starting amount before the transactions you record in this app."
          keyboardType="decimal-pad"
          label="Opening balance"
          onChangeText={setOpeningBalance}
          placeholder="0.00"
          trailingText="ZMW"
          value={openingBalance}
        />
      </Card>

      <Button
        fullWidth
        icon="check"
        label={account ? 'Save changes' : 'Create account'}
        onPress={handleSave}
        style={styles.saveButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: spacing.xl,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});
