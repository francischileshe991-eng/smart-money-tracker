import type { Category, Transaction, TransactionType } from '../types/finance';

/**
 * Pure transaction querying for the history screen.
 *
 * Search, type/category/date filtering and sorting live here so they can be
 * exercised without React and always operate on the same ledger the provider
 * uses for balances.
 */

export type TransactionTypeFilter = 'all' | TransactionType;
export type TransactionCategoryFilter = Category | 'all';
export type TransactionSortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export type TransactionQuery = {
  query: string;
  type: TransactionTypeFilter;
  category: TransactionCategoryFilter;
  fromDate: string | null;
  toDate: string | null;
  sort: TransactionSortOption;
};

export const DEFAULT_TRANSACTION_QUERY: TransactionQuery = {
  query: '',
  type: 'all',
  category: 'all',
  fromDate: null,
  toDate: null,
  sort: 'date-desc',
};

/** Human-readable account label for a row, including both sides of a transfer. */
export function transactionAccountLabel(
  transaction: Transaction,
  accountNames: ReadonlyMap<string, string>
): string {
  if (transaction.type === 'transfer') {
    const from = accountNames.get(transaction.fromAccountId) ?? 'Unknown account';
    const to = accountNames.get(transaction.toAccountId) ?? 'Unknown account';
    return `${from} → ${to}`;
  }

  return accountNames.get(transaction.accountId) ?? 'Unknown account';
}

function matchesQuery(
  transaction: Transaction,
  query: string,
  accountNames: ReadonlyMap<string, string>
): boolean {
  if (query.length === 0) {
    return true;
  }

  const categoryText = transaction.type === 'transfer' ? 'transfer' : transaction.category;
  const accountText = transactionAccountLabel(transaction, accountNames);
  const noteText = transaction.note ?? '';

  return [transaction.title, categoryText, noteText, accountText]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function sortTransactions(
  transactions: Transaction[],
  sort: TransactionSortOption
): Transaction[] {
  return transactions.slice().sort((a, b) => {
    switch (sort) {
      case 'date-asc':
        return a.date.localeCompare(b.date);
      case 'amount-desc':
        return b.amountMinor - a.amountMinor;
      case 'amount-asc':
        return a.amountMinor - b.amountMinor;
      case 'date-desc':
      default:
        return b.date.localeCompare(a.date);
    }
  });
}

export function filterAndSortTransactions(
  transactions: Transaction[],
  query: TransactionQuery,
  accountNames: ReadonlyMap<string, string>
): Transaction[] {
  const normalizedQuery = query.query.trim().toLowerCase();

  const matching = transactions.filter((transaction) => {
    if (query.type !== 'all' && transaction.type !== query.type) {
      return false;
    }

    if (
      query.category !== 'all' &&
      (transaction.type === 'transfer' || transaction.category !== query.category)
    ) {
      return false;
    }

    if (query.fromDate && transaction.date < query.fromDate) {
      return false;
    }

    if (query.toDate && transaction.date > query.toDate) {
      return false;
    }

    return matchesQuery(transaction, normalizedQuery, accountNames);
  });

  return sortTransactions(matching, query.sort);
}
