import type { Account, Budget, SavingsGoal, Transaction } from '@/types/finance';

/** The complete set of user-owned finance records that is stored locally and synced to Supabase. */
export type FinanceSnapshot = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
};

export type SnapshotMetadata = {
  /** Remote revision this snapshot is based on. Zero when it has never been synced. */
  revision: number;
  /** True when the local snapshot contains changes that have not reached the server. */
  dirty: boolean;
  updatedAt: string;
};

export type LocalFinanceSnapshot = FinanceSnapshot & SnapshotMetadata;

export function emptySnapshot(): FinanceSnapshot {
  return { accounts: [], transactions: [], budgets: [], savingsGoals: [] };
}

export function serializeSnapshot(snapshot: FinanceSnapshot): string {
  return JSON.stringify({
    accounts: snapshot.accounts,
    transactions: snapshot.transactions,
    budgets: snapshot.budgets,
    savingsGoals: snapshot.savingsGoals,
  });
}
