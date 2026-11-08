import type { Account, Category, Transaction, TransactionType } from '../types/finance';

/** Rank a user's categories by usage, keeping the supplied order for ties and new users. */
export function quickCategories(
  transactions: Transaction[],
  type: Exclude<TransactionType, 'transfer'>,
  categories: readonly Category[]
): Category[] {
  const counts = new Map<Category, number>();
  for (const transaction of transactions) {
    if (transaction.type === type) {
      counts.set(transaction.category, (counts.get(transaction.category) ?? 0) + 1);
    }
  }
  return [...categories]
    .sort((left, right) => (counts.get(right) ?? 0) - (counts.get(left) ?? 0))
    .slice(0, 4);
}

/** Explicit account links take precedence; deleted and archived preferences are ignored. */
export function preferredAccountId(accounts: Account[], rememberedId?: string | null, explicitId?: string): string {
  const activeAccounts = accounts.filter((account) => !account.archived);
  return [explicitId, rememberedId].find((id) => activeAccounts.some((account) => account.id === id))
    ?? activeAccounts[0]?.id ?? '';
}
