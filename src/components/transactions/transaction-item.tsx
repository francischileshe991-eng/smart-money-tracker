import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';

import { getCategoryIcon } from '@/data/categories';
import { colors, radii, spacing } from '@/theme';
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
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const formattedAmount = isTransfer
    ? formatMoney(transaction.amountMinor)
    : formatSignedMoney(transaction.amountMinor, transaction.type);
  const amountColor = isTransfer ? 'text' : isIncome ? 'income' : 'expense';
  const details = isTransfer
    ? accountLabel ?? 'Transfer'
    : [transaction.category, accountLabel].filter(Boolean).join(' · ');
  const typeLabel = isTransfer ? 'Transfer' : isIncome ? 'Income' : 'Expense';

  return (
    <Pressable
      accessibilityLabel={`${typeLabel}: ${transaction.title}, ${formattedAmount}${
        details ? `, ${details}` : ''
      }, ${formatTransactionDate(transaction.date)}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isTransfer
              ? colors.primarySoft
              : isIncome
                ? colors.incomeSoft
                : colors.expenseSoft,
          },
        ]}
      >
        <Icon
          name={isTransfer ? 'transfer' : getCategoryIcon(transaction.category)}
          size={19}
          color={isTransfer ? 'primary' : isIncome ? 'income' : 'expense'}
        />
      </View>

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

      {onPress ? <Icon name="chevronRight" size={14} color="textMuted" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
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
