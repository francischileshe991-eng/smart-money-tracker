import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { spacing, useThemeColors } from '@/theme';
import type { Transaction } from '@/types/finance';
import { formatMoney, formatSignedMoney } from '@/utils/currency';
import { formatTransactionDate } from '@/utils/date';

type TransactionItemProps = {
  transaction: Transaction;
  /** Account name(s) resolved by the list that renders this row. */
  accountLabel?: string;
  onPress?: () => void;
};

export function TransactionItem({
  transaction,
  accountLabel,
  onPress,
}: TransactionItemProps) {
  const colors = useThemeColors();
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const formattedAmount = isTransfer
    ? formatMoney(transaction.amountMinor)
    : formatSignedMoney(transaction.amountMinor, transaction.type);
  const amountColor = isIncome ? 'income' : 'text';
  const details = isTransfer
    ? accountLabel ?? 'Transfer'
    : [transaction.category === transaction.title ? undefined : transaction.category, accountLabel].filter(Boolean).join(' · ')
      || (isIncome ? 'Income' : 'Expense');
  const typeLabel = isTransfer ? 'Transfer' : isIncome ? 'Income' : 'Expense';

  return (
    <Pressable
      accessibilityLabel={`${typeLabel}: ${transaction.title}, ${formattedAmount}${
        details ? `, ${details}` : ''
      }, ${formatTransactionDate(transaction.date)}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
    >
      <View style={styles.details}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {transaction.title}
        </AppText>
        <AppText numberOfLines={1} variant="caption" color="textMuted">
          {details}
        </AppText>
      </View>

      <View style={styles.amountColumn}>
        <AppText numberOfLines={1} variant="amountSmall" color={amountColor}>
          {formattedAmount}
        </AppText>
        <AppText numberOfLines={1} variant="caption" color="textMuted" style={styles.date}>
          {formatTransactionDate(transaction.date)}
        </AppText>
      </View>

    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    paddingVertical: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  details: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  amountColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 2,
  },
  date: {
    textAlign: 'right',
  },
});
