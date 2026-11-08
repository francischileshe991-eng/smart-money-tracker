import * as SQLite from 'expo-sqlite';

import {
  serializeSnapshot,
  type FinanceSnapshot,
  type LocalFinanceSnapshot,
} from './finance-snapshot';

const DATABASE_NAME = 'smart-money-tracker.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        create table if not exists finance_snapshots (
          user_id text primary key not null,
          snapshot text not null,
          revision integer not null default 0,
          dirty integer not null default 0,
          updated_at text not null
        );
      `);
      return database;
    });
  }

  return databasePromise;
}

type SnapshotRow = {
  snapshot: string;
  revision: number;
  dirty: number;
  updated_at: string;
};

function parseSnapshot(raw: string): FinanceSnapshot {
  const parsed = JSON.parse(raw) as Partial<FinanceSnapshot>;
  return {
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
    savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
  };
}

export async function loadLocalSnapshot(userId: string): Promise<LocalFinanceSnapshot | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<SnapshotRow>(
    'select snapshot, revision, dirty, updated_at from finance_snapshots where user_id = ?',
    userId
  );

  if (!row) return null;

  try {
    return {
      ...parseSnapshot(row.snapshot),
      revision: Number(row.revision) || 0,
      dirty: row.dirty === 1,
      updatedAt: row.updated_at,
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
  const database = await getDatabase();
  await database.runAsync(
    `insert into finance_snapshots (user_id, snapshot, revision, dirty, updated_at)
     values (?, ?, ?, ?, ?)
     on conflict(user_id) do update set
       snapshot = excluded.snapshot,
       revision = excluded.revision,
       dirty = excluded.dirty,
       updated_at = excluded.updated_at`,
    userId,
    serializeSnapshot(snapshot),
    metadata.revision,
    metadata.dirty ? 1 : 0,
    new Date().toISOString()
  );
}

export async function clearLocalSnapshot(userId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('delete from finance_snapshots where user_id = ?', userId);
}
