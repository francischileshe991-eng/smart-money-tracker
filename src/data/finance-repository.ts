import type { SupabaseClient } from '@supabase/supabase-js';
import type { Account, Budget, SavingsGoal, Transaction } from '@/types/finance';

type Snapshot = { accounts: Account[]; transactions: Transaction[]; budgets: Budget[]; savingsGoals: SavingsGoal[] };
type Row = Record<string, unknown>;
const str = (row: Row, key: string) => String(row[key] ?? '');
const num = (row: Row, key: string) => Number(row[key] ?? 0);

export async function loadFinanceData(client: SupabaseClient, userId: string): Promise<Snapshot> {
  const [accounts, categories, transactions, budgets, goals, events] = await Promise.all([
    client.from('accounts').select('*').eq('user_id', userId),
    client.from('categories').select('*').eq('user_id', userId),
    client.from('transactions').select('*').eq('user_id', userId).order('transaction_date', { ascending: false }),
    client.from('budgets').select('*').eq('user_id', userId),
    client.from('savings_goals').select('*').eq('user_id', userId),
    client.from('goal_contributions').select('*').eq('user_id', userId).order('contribution_date'),
  ]);
  for (const result of [accounts,categories,transactions,budgets,goals,events]) if (result.error) throw result.error;
  const categoryNames = new Map((categories.data as Row[]).map((row) => [str(row,'id'), str(row,'name')]));
  const history = new Map<string, {id:string;amountMinor:number;type:'contribution'|'withdrawal';date:string}[]>();
  for (const row of events.data as Row[]) {
    const goalId = str(row,'goal_id');
    history.set(goalId, [...(history.get(goalId) ?? []), {id:str(row,'id'),amountMinor:num(row,'amount_minor'),type:str(row,'type') as 'contribution'|'withdrawal',date:str(row,'contribution_date')}]);
  }
  return {
    accounts: (accounts.data as Row[]).map((row) => ({id:str(row,'id'),name:str(row,'name'),type:str(row,'type') as Account['type'],openingBalanceMinor:num(row,'opening_balance_minor'),archived:Boolean(row.archived)})),
    transactions: (transactions.data as Row[]).map((row) => {
      const base = {id:str(row,'id'),title:str(row,'title'),amountMinor:num(row,'amount_minor'),date:str(row,'transaction_date'),note:row.note ? str(row,'note') : undefined};
      if (row.type === 'transfer') return {...base,type:'transfer' as const,fromAccountId:str(row,'from_account_id'),toAccountId:str(row,'to_account_id')};
      return {...base,type:str(row,'type') as 'income'|'expense',category:categoryNames.get(str(row,'category_id')) as never,accountId:str(row,'account_id')} as Transaction;
    }),
    budgets: (budgets.data as Row[]).map((row) => ({id:str(row,'id'),category:categoryNames.get(str(row,'category_id')) as Budget['category'],limitMinor:num(row,'limit_minor'),period:str(row,'period') as Budget['period'],startDate:row.start_date ? str(row,'start_date'):undefined,endDate:row.end_date ? str(row,'end_date'):undefined,warningThreshold:num(row,'warning_threshold')})),
    savingsGoals: (goals.data as Row[]).map((row) => ({id:str(row,'id'),name:str(row,'name'),targetMinor:num(row,'target_minor'),targetDate:row.target_date ? str(row,'target_date'):undefined,completed:Boolean(row.completed),history:history.get(str(row,'id')) ?? [],contributedMinor:(history.get(str(row,'id')) ?? []).reduce((total,event)=>total+(event.type==='contribution'?event.amountMinor:-event.amountMinor),0)})),
  };
}

export async function saveFinanceData(client: SupabaseClient, snapshot: Snapshot) {
  const { error } = await client.rpc('save_finance_snapshot', {
    p_accounts: snapshot.accounts,
    p_transactions: snapshot.transactions,
    p_budgets: snapshot.budgets,
    p_savings_goals: snapshot.savingsGoals,
  });
  if (error) throw error;
}
