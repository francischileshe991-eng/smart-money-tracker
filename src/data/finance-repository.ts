import type { SupabaseClient } from '@supabase/supabase-js';

import type { Account, Budget, Transaction } from '@/types/finance';
import type { FinanceSnapshot } from '@/data/finance-snapshot';

type Row = Record<string, unknown>;
const str = (row: Row, key: string) => String(row[key] ?? '');
const num = (row: Row, key: string) => Number(row[key] ?? 0);

/** Read until an empty page, including when the server caps pages below our limit. */
async function loadAllRows(
  client: SupabaseClient,
  table: string,
  userId: string,
  dateColumn?: string,
  ascending = true
): Promise<Row[]> {
  const rows: Row[] = [];
  const pageSize = 500;

  while (true) {
    let query = client.from(table).select('*').eq('user_id', userId);
    if (dateColumn) query = query.order(dateColumn, { ascending });
    // IDs break ties when many transactions/contributions share the same date.
    const { data, error } = await query.order('id').range(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    if (!data) throw new Error(`Could not load ${table}: the server returned no data.`);
    if (data.length === 0) return rows;
    rows.push(...data);
  }
}

export type LoadedFinanceSnapshot = {
  snapshot: FinanceSnapshot;
  /** Cloud revision that the loaded snapshot belongs to. */
  revision: number;
  /** True when the account has any finance rows stored in the cloud. */
  hasData: boolean;
};

export type SaveFinanceResult = {
  conflict: boolean;
  revision: number;
};

export async function loadFinanceData(
  client: SupabaseClient,
  userId: string
): Promise<LoadedFinanceSnapshot> {
  const revisionBefore = await client.from('finance_sync_state').select('revision').eq('user_id', userId).maybeSingle();
  if (revisionBefore.error) throw revisionBefore.error;

  const [accounts, categories, transactions, budgets, goals, events] = await Promise.all([
    loadAllRows(client, 'accounts', userId),
    loadAllRows(client, 'categories', userId),
    loadAllRows(client, 'transactions', userId, 'transaction_date', false),
    loadAllRows(client, 'budgets', userId),
    loadAllRows(client, 'savings_goals', userId),
    loadAllRows(client, 'goal_contributions', userId, 'contribution_date'),
  ]);

  const categoryNames = new Map(categories.map((row) => [str(row, 'id'), str(row, 'name')]));
  const history = new Map<string, { id: string; amountMinor: number; type: 'contribution' | 'withdrawal'; date: string }[]>();
  for (const row of events) {
    const goalId = str(row, 'goal_id');
    const goalHistory = history.get(goalId) ?? [];
    goalHistory.push({
      id: str(row, 'id'),
      amountMinor: num(row, 'amount_minor'),
      type: str(row, 'type') as 'contribution' | 'withdrawal',
      date: str(row, 'contribution_date'),
    });
    history.set(goalId, goalHistory);
  }

  const snapshot: FinanceSnapshot = {
    accounts: accounts.map((row) => ({
      id: str(row, 'id'),
      name: str(row, 'name'),
      type: str(row, 'type') as Account['type'],
      openingBalanceMinor: num(row, 'opening_balance_minor'),
      archived: Boolean(row.archived),
    })),
    transactions: transactions.map((row) => {
      const base = {
        id: str(row, 'id'),
        title: str(row, 'title'),
        amountMinor: num(row, 'amount_minor'),
        date: str(row, 'transaction_date'),
        note: row.note ? str(row, 'note') : undefined,
      };
      if (row.type === 'transfer') {
        return {
          ...base,
          type: 'transfer' as const,
          fromAccountId: str(row, 'from_account_id'),
          toAccountId: str(row, 'to_account_id'),
        };
      }
      return {
        ...base,
        type: str(row, 'type') as 'income' | 'expense',
        category: categoryNames.get(str(row, 'category_id')) as never,
        accountId: str(row, 'account_id'),
      } as Transaction;
    }),
    budgets: budgets.map((row) => ({
      id: str(row, 'id'),
      category: categoryNames.get(str(row, 'category_id')) as Budget['category'],
      limitMinor: num(row, 'limit_minor'),
      period: str(row, 'period') as Budget['period'],
      startDate: row.start_date ? str(row, 'start_date') : undefined,
      endDate: row.end_date ? str(row, 'end_date') : undefined,
      warningThreshold: num(row, 'warning_threshold'),
    })),
    savingsGoals: goals.map((row) => ({
      id: str(row, 'id'),
      name: str(row, 'name'),
      targetMinor: num(row, 'target_minor'),
      targetDate: row.target_date ? str(row, 'target_date') : undefined,
      completed: Boolean(row.completed),
      history: history.get(str(row, 'id')) ?? [],
      contributedMinor: (history.get(str(row, 'id')) ?? []).reduce(
        (total, event) => total + (event.type === 'contribution' ? event.amountMinor : -event.amountMinor),
        0
      ),
    })),
  };

  const hasData =
    snapshot.accounts.length > 0 ||
    snapshot.transactions.length > 0 ||
    snapshot.budgets.length > 0 ||
    snapshot.savingsGoals.length > 0;

  // The rows are read using separate requests. Verify no other device replaced
  // the snapshot between those requests so we never pair mixed rows with a new revision.
  const revisionAfter = await client.from('finance_sync_state').select('revision').eq('user_id', userId).maybeSingle();
  if (revisionAfter.error) throw revisionAfter.error;
  const revisionBeforeNumber = Number((revisionBefore.data as Row | null)?.revision ?? 0) || 0;
  const revisionAfterNumber = Number((revisionAfter.data as Row | null)?.revision ?? 0) || 0;
  if (revisionBeforeNumber !== revisionAfterNumber) {
    throw new Error('Your cloud data changed while it was loading. Please retry sync.');
  }

  return {
    snapshot,
    revision: revisionAfterNumber,
    hasData,
  };
}

/**
 * Writes the entire snapshot through the transactional save RPC.
 *
 * Pass the last revision the local copy was based on for optimistic concurrency.
 * Pass `null` to force-write after the user chooses to keep their local changes.
 */
export async function saveFinanceData(
  client: SupabaseClient,
  snapshot: FinanceSnapshot,
  expectedRevision: number | null
): Promise<SaveFinanceResult> {
  const { data, error } = await client.rpc('save_finance_snapshot', {
    p_accounts: snapshot.accounts,
    p_transactions: snapshot.transactions,
    p_budgets: snapshot.budgets,
    p_savings_goals: snapshot.savingsGoals,
    p_expected_revision: expectedRevision,
  });
  if (error) throw error;

  const result = (Array.isArray(data) ? data[0] : data) as { conflict?: boolean; revision?: number } | null;

  return {
    conflict: Boolean(result?.conflict),
    revision: Number(result?.revision ?? expectedRevision ?? 0),
  };
}
