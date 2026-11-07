import type {
  Account,
  AccountWithBalance,
  Budget,
  BudgetWithSpending,
  NewTransaction,
  Transaction,
} from '../types/finance';

/**
 * Pure, integer-only financial calculations.
 *
 * Keeping these functions free of React makes the financial rules testable and
 * ensures account balances and budget usage are always derived from the same
 * transaction ledger. Transfers move money between accounts and are never
 * counted as income or expenses.
 */

export function sumIncomeMinor(transactions: Transaction[]): number {
  return transactions.reduce(
    (total, transaction) => (transaction.type === 'income' ? total + transaction.amountMinor : total),
    0
  );
}

export function sumExpenseMinor(transactions: Transaction[]): number {
  return transactions.reduce(
    (total, transaction) => (transaction.type === 'expense' ? total + transaction.amountMinor : total),
    0
  );
}

export function transactionInMonth(transaction: Transaction, monthPrefix: string): boolean {
  return transaction.date.startsWith(monthPrefix);
}

export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): AccountWithBalance[] {
  return accounts.map((account) => {
    let balanceMinor = account.openingBalanceMinor;

    for (const transaction of transactions) {
      if (transaction.type === 'income' && transaction.accountId === account.id) {
        balanceMinor += transaction.amountMinor;
      } else if (transaction.type === 'expense' && transaction.accountId === account.id) {
        balanceMinor -= transaction.amountMinor;
      } else if (transaction.type === 'transfer') {
        if (transaction.fromAccountId === account.id) {
          balanceMinor -= transaction.amountMinor;
        }

        if (transaction.toAccountId === account.id) {
          balanceMinor += transaction.amountMinor;
        }
      }
    }

    return { ...account, balanceMinor };
  });
}

export function calculateTotalBalance(accounts: AccountWithBalance[]): number {
  return accounts.reduce((total, account) => total + account.balanceMinor, 0);
}

export function transactionReferencesAccount(transaction: Transaction, accountId: string): boolean {
  if (transaction.type === 'transfer') {
    return transaction.fromAccountId === accountId || transaction.toAccountId === accountId;
  }

  return transaction.accountId === accountId;
}

export function transactionHasValidAccounts(
  transaction: NewTransaction,
  accounts: Account[],
  allowArchived = false
): boolean {
  if (transaction.amountMinor <= 0) {
    return false;
  }

  const accountIds = new Set(
    accounts
      .filter((account) => allowArchived || !account.archived)
      .map((account) => account.id)
  );

  if (transaction.type === 'transfer') {
    return (
      transaction.fromAccountId !== transaction.toAccountId &&
      accountIds.has(transaction.fromAccountId) &&
      accountIds.has(transaction.toAccountId)
    );
  }

  return accountIds.has(transaction.accountId);
}

export function calculateBudgetSpending(
  budgets: Budget[],
  transactions: Transaction[],
  today = new Date().toISOString().slice(0, 10)
): BudgetWithSpending[] {
  return budgets.map((budget) => {
    const period = budget.period ?? 'monthly';
    const startDate = period === 'custom' ? budget.startDate ?? today : `${today.slice(0, 7)}-01`;
    const endDate = period === 'custom' ? budget.endDate ?? today : `${today.slice(0, 7)}-31`;
    const spentMinor = transactions.reduce(
      (total, transaction) =>
        transaction.type === 'expense' && transaction.category === budget.category &&
        transaction.date >= startDate && transaction.date <= endDate
          ? total + transaction.amountMinor
          : total,
      0
    );
    const threshold = budget.warningThreshold ?? 80;
    const progress = budget.limitMinor > 0 ? Math.round((spentMinor * 100) / budget.limitMinor) : 0;
    return {
      ...budget,
      period,
      spentMinor,
      remainingMinor: budget.limitMinor - spentMinor,
      progress,
      warning: spentMinor > budget.limitMinor ? 'over' : progress >= threshold ? 'near' : 'none',
    };
  });
}
