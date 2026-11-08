import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  serializeSnapshot,
  type FinanceSnapshot,
  type LocalFinanceSnapshot,
} from './finance-snapshot';

function storageKey(userId: string) {
  return `smart-money-tracker:finance-snapshot:${userId}`;
}

type StoredSnapshot = {
  snapshot: FinanceSnapshot;
  revision: number;
  dirty: boolean;
  updatedAt?: string;
};

export async function loadLocalSnapshot(userId: string): Promise<LocalFinanceSnapshot | null> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSnapshot>;
    if (!parsed.snapshot) return null;

    return {
      accounts: Array.isArray(parsed.snapshot.accounts) ? parsed.snapshot.accounts : [],
      transactions: Array.isArray(parsed.snapshot.transactions) ? parsed.snapshot.transactions : [],
      budgets: Array.isArray(parsed.snapshot.budgets) ? parsed.snapshot.budgets : [],
      savingsGoals: Array.isArray(parsed.snapshot.savingsGoals) ? parsed.snapshot.savingsGoals : [],
      revision: Number(parsed.revision) || 0,
      dirty: Boolean(parsed.dirty),
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveLocalSnapshot(
  userId: string,
  snapshot: FinanceSnapshot,
  metadata: { revision: number; dirty: boolean }
): Promise<void> {
  const stored: StoredSnapshot = {
    snapshot: JSON.parse(serializeSnapshot(snapshot)) as FinanceSnapshot,
    revision: metadata.revision,
    dirty: metadata.dirty,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(stored));
}

export async function clearLocalSnapshot(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}
