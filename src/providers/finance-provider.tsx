import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type {
  Account,
  AccountWithBalance,
  Budget,
  BudgetWithSpending,
  NewAccount,
  NewTransaction,
  SavingsGoal,
  SavingsGoalContribution,
  Transaction,
} from '@/types/finance';
import { currentMonthPrefix } from '@/utils/date';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { loadFinanceData, saveFinanceData } from '@/data/finance-repository';
import {
  calculateAccountBalances,
  calculateBudgetSpending,
  calculateTotalBalance,
  transactionHasValidAccounts,
  sumExpenseMinor,
  sumIncomeMinor,
  transactionReferencesAccount,
  transactionInMonth,
} from '@/utils/finance';

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  nextAccountId: number;
  nextTransactionId: number;
  nextBudgetId: number;
  nextGoalId: number;
  nextGoalEventId: number;
  ready: boolean;
}

type FinanceAction =
  | { type: 'hydrate-data'; data: Pick<FinanceState, 'accounts' | 'transactions' | 'budgets' | 'savingsGoals'> }
  | { type: 'add-account'; account: NewAccount }
  | { type: 'update-account'; id: string; account: NewAccount }
  | { type: 'archive-account'; id: string }
  | { type: 'restore-account'; id: string }
  | { type: 'delete-account'; id: string }
  | { type: 'add-transaction'; transaction: NewTransaction }
  | { type: 'update-transaction'; id: string; transaction: NewTransaction }
  | { type: 'delete-transaction'; id: string }
  | { type: 'save-budget'; budget: Omit<Budget, 'id'>; id?: string }
  | { type: 'delete-budget'; id: string }
  | { type: 'save-goal'; goal: Omit<SavingsGoal, 'id' | 'contributedMinor' | 'history'>; id?: string }
  | { type: 'delete-goal'; id: string }
  | { type: 'goal-contribution'; goalId: string; event: SavingsGoalContribution }
  | { type: 'complete-goal'; id: string; completed: boolean }
  | { type: 'reset-data' };

interface FinanceContextValue {
  accounts: AccountWithBalance[];
  allAccounts: AccountWithBalance[];
  transactions: Transaction[];
  budgets: BudgetWithSpending[];
  savingsGoals: SavingsGoal[];
  incomeMinor: number;
  expenseMinor: number;
  monthlyIncomeMinor: number;
  monthlyExpenseMinor: number;
  savingsContributedMinor: number;
  savingsTargetMinor: number;
  totalBalanceMinor: number;
  addAccount: (account: NewAccount) => void;
  updateAccount: (id: string, account: NewAccount) => void;
  archiveAccount: (id: string) => void;
  restoreAccount: (id: string) => void;
  deleteAccount: (id: string) => boolean;
  addTransaction: (transaction: NewTransaction) => boolean;
  updateTransaction: (id: string, transaction: NewTransaction) => boolean;
  deleteTransaction: (id: string) => void;
  saveBudget: (budget: Omit<Budget, 'id'>, id?: string) => boolean;
  deleteBudget: (id: string) => void;
  saveGoal: (goal: Omit<SavingsGoal, 'id' | 'contributedMinor' | 'history'>, id?: string) => boolean;
  deleteGoal: (id: string) => void;
  recordGoalContribution: (goalId: string, amountMinor: number, type: 'contribution' | 'withdrawal') => boolean;
  setGoalCompleted: (id: string, completed: boolean) => void;
  resetData: () => void;
  dataLoading: boolean;
  dataError: string | null;
  reloadData: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function createInitialState(): FinanceState {
  return {
    accounts: [], transactions: [], budgets: [], savingsGoals: [],
    nextAccountId: 1,
    nextTransactionId: 1,
    nextBudgetId: 1,
    nextGoalId: 1,
    nextGoalEventId: 1,
    ready: false,
  };
}

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case 'hydrate-data':
      return { ...state, ...action.data, ready: true };
    case 'add-account': {
      let id = cryptoId();
      let nextAccountId = state.nextAccountId + 1;

      while (state.accounts.some((account) => account.id === id)) {
        id = cryptoId();
        nextAccountId += 1;
      }

      return {
        ...state,
        accounts: [...state.accounts, { ...action.account, id }],
        nextAccountId,
      };
    }
    case 'update-account':
      return {
        ...state,
        accounts: state.accounts.map((account) =>
          account.id === action.id ? { ...account, ...action.account } : account
        ),
      };
    case 'archive-account':
      return {
        ...state,
        accounts: state.accounts.map((account) =>
          account.id === action.id ? { ...account, archived: true } : account
        ),
      };
    case 'restore-account':
      return {
        ...state,
        accounts: state.accounts.map((account) =>
          account.id === action.id ? { ...account, archived: false } : account
        ),
      };
    case 'delete-account':
      if (state.transactions.some((transaction) => transactionReferencesAccount(transaction, action.id))) {
        return state;
      }

      return {
        ...state,
        accounts: state.accounts.filter((account) => account.id !== action.id),
      };
    case 'add-transaction':
      if (!transactionHasValidAccounts(action.transaction, state.accounts)) {
        return state;
      }

      return {
        ...state,
        transactions: [
          {
            ...action.transaction,
            id: cryptoId(),
          },
          ...state.transactions,
        ],
        nextTransactionId: state.nextTransactionId + 1,
      };
    case 'update-transaction':
      if (!transactionHasValidAccounts(action.transaction, state.accounts, true)) {
        return state;
      }

      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.id
            ? { ...action.transaction, id: action.id }
            : transaction
        ),
      };
    case 'delete-transaction':
      return {
        ...state,
        transactions: state.transactions.filter((transaction) => transaction.id !== action.id),
      };
    case 'save-budget': {
      if (action.budget.limitMinor <= 0 || state.budgets.some((budget) => budget.category === action.budget.category && budget.id !== action.id)) return state;
      if (action.id) return { ...state, budgets: state.budgets.map((budget) => budget.id === action.id ? { ...action.budget, id: action.id } : budget) };
      const id = cryptoId();
      return { ...state, budgets: [...state.budgets, { ...action.budget, id }], nextBudgetId: state.nextBudgetId + 1 };
    }
    case 'delete-budget':
      return { ...state, budgets: state.budgets.filter((budget) => budget.id !== action.id) };
    case 'save-goal': {
      if (action.goal.targetMinor <= 0 || !action.goal.name.trim()) return state;
      if (action.id) return { ...state, savingsGoals: state.savingsGoals.map((goal) => goal.id === action.id ? { ...goal, ...action.goal, name: action.goal.name.trim() } : goal) };
      const id = cryptoId();
      return { ...state, savingsGoals: [...state.savingsGoals, { ...action.goal, id, name: action.goal.name.trim(), contributedMinor: 0, history: [] }], nextGoalId: state.nextGoalId + 1 };
    }
    case 'delete-goal':
      return { ...state, savingsGoals: state.savingsGoals.filter((goal) => goal.id !== action.id) };
    case 'goal-contribution': {
      const goal = state.savingsGoals.find((item) => item.id === action.goalId);
      if (!goal || action.event.amountMinor <= 0 || (action.event.type === 'withdrawal' && action.event.amountMinor > goal.contributedMinor)) return state;
      const delta = action.event.type === 'contribution' ? action.event.amountMinor : -action.event.amountMinor;
      return { ...state, savingsGoals: state.savingsGoals.map((item) => item.id === action.goalId ? { ...item, contributedMinor: item.contributedMinor + delta, history: [...(item.history ?? []), action.event] } : item), nextGoalEventId: state.nextGoalEventId + 1 };
    }
    case 'complete-goal':
      return { ...state, savingsGoals: state.savingsGoals.map((goal) => goal.id === action.id ? { ...goal, completed: action.completed } : goal) };
    case 'reset-data':
      return { ...createInitialState(), ready: true };
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, undefined, createInitialState);
  const { user } = useAuth();
  const userId = user?.id;
  const [dataError, setDataError] = useState<string | null>(null);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const dataLoading = Boolean(userId && readyUserId !== userId);

  useEffect(() => {
    let active = true;
    if (!userId || !supabase) return () => { active = false; };
    loadFinanceData(supabase, userId).then((data) => {
      if (!active) return;
      dispatch({ type: 'hydrate-data', data });
      setDataError(null);
      setReadyUserId(userId);
    }).catch((cause: unknown) => {
      if (active) setDataError(cause instanceof Error ? cause.message : 'Could not load your financial data.');
    });
    return () => { active = false; };
  }, [userId, loadAttempt]);

  useEffect(() => {
    const client = supabase;
    if (!userId || !client || !state.ready || readyUserId !== userId) return;
    const snapshot = { accounts: state.accounts, transactions: state.transactions, budgets: state.budgets, savingsGoals: state.savingsGoals };
    saveQueue.current = saveQueue.current.then(() => saveFinanceData(client, snapshot)).then(() => {
      setDataError(null);
    }).catch((cause: unknown) => {
      setDataError(cause instanceof Error ? cause.message : 'Could not save your financial data.');
    });
  }, [state.accounts, state.transactions, state.budgets, state.savingsGoals, state.ready, userId, readyUserId]);
  const monthPrefix = currentMonthPrefix();

  const allAccounts = useMemo<AccountWithBalance[]>(
    () => calculateAccountBalances(state.accounts, state.transactions),
    [state.accounts, state.transactions]
  );
  const accounts = useMemo(
    () => allAccounts.filter((account) => !account.archived),
    [allAccounts]
  );

  const incomeMinor = useMemo(() => sumIncomeMinor(state.transactions), [state.transactions]);
  const expenseMinor = useMemo(() => sumExpenseMinor(state.transactions), [state.transactions]);

  const monthlyIncomeMinor = useMemo(
    () =>
      sumIncomeMinor(
        state.transactions.filter((transaction) => transactionInMonth(transaction, monthPrefix))
      ),
    [monthPrefix, state.transactions]
  );

  const monthlyExpenseMinor = useMemo(
    () =>
      sumExpenseMinor(
        state.transactions.filter((transaction) => transactionInMonth(transaction, monthPrefix))
      ),
    [monthPrefix, state.transactions]
  );

  const budgets = useMemo<BudgetWithSpending[]>(
    () => calculateBudgetSpending(state.budgets, state.transactions),
    [state.budgets, state.transactions]
  );

  const savingsContributedMinor = useMemo(
    () => state.savingsGoals.reduce((total, goal) => total + goal.contributedMinor, 0),
    [state.savingsGoals]
  );

  const savingsTargetMinor = useMemo(
    () => state.savingsGoals.reduce((total, goal) => total + goal.targetMinor, 0),
    [state.savingsGoals]
  );

  const totalBalanceMinor = useMemo(() => calculateTotalBalance(accounts), [accounts]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      accounts,
      allAccounts,
      transactions: state.transactions,
      budgets,
      savingsGoals: state.savingsGoals,
      incomeMinor,
      expenseMinor,
      monthlyIncomeMinor,
      monthlyExpenseMinor,
      savingsContributedMinor,
      savingsTargetMinor,
      totalBalanceMinor,
      addAccount: (account) => dispatch({ type: 'add-account', account }),
      updateAccount: (id, account) => dispatch({ type: 'update-account', id, account }),
      archiveAccount: (id) => dispatch({ type: 'archive-account', id }),
      restoreAccount: (id) => dispatch({ type: 'restore-account', id }),
      deleteAccount: (id) => {
        if (
          !state.accounts.some((account) => account.id === id) ||
          state.transactions.some((transaction) => transactionReferencesAccount(transaction, id))
        ) {
          return false;
        }

        dispatch({ type: 'delete-account', id });
        return true;
      },
      addTransaction: (transaction) => {
        if (!transactionHasValidAccounts(transaction, state.accounts)) {
          return false;
        }

        dispatch({ type: 'add-transaction', transaction });
        return true;
      },
      updateTransaction: (id, transaction) => {
        if (
          !state.transactions.some((item) => item.id === id) ||
          !transactionHasValidAccounts(transaction, state.accounts, true)
        ) {
          return false;
        }

        dispatch({ type: 'update-transaction', id, transaction });
        return true;
      },
      deleteTransaction: (id) => dispatch({ type: 'delete-transaction', id }),
      saveBudget: (budget, id) => {
        if (budget.limitMinor <= 0 || state.budgets.some((item) => item.category === budget.category && item.id !== id)) return false;
        if (budget.period === 'custom' && (!budget.startDate || !budget.endDate || budget.startDate > budget.endDate)) return false;
        dispatch({ type: 'save-budget', budget, id });
        return true;
      },
      deleteBudget: (id) => dispatch({ type: 'delete-budget', id }),
      saveGoal: (goal, id) => {
        if (!goal.name.trim() || goal.targetMinor <= 0) return false;
        dispatch({ type: 'save-goal', goal, id });
        return true;
      },
      deleteGoal: (id) => dispatch({ type: 'delete-goal', id }),
      recordGoalContribution: (goalId, amountMinor, type) => {
        const goal = state.savingsGoals.find((item) => item.id === goalId);
        if (!goal || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || (type === 'withdrawal' && amountMinor > goal.contributedMinor)) return false;
        const event: SavingsGoalContribution = { id: cryptoId(), amountMinor, type, date: new Date().toISOString().slice(0, 10) };
        dispatch({ type: 'goal-contribution', goalId, event });
        return true;
      },
      setGoalCompleted: (id, completed) => dispatch({ type: 'complete-goal', id, completed }),
      resetData: () => dispatch({ type: 'reset-data' }),
      dataLoading,
      dataError,
      reloadData: () => { setDataError(null); setReadyUserId(null); setLoadAttempt((attempt) => attempt + 1); },
    }),
    [
      accounts,
      allAccounts,
      state,
      budgets,
      incomeMinor,
      expenseMinor,
      monthlyIncomeMinor,
      monthlyExpenseMinor,
      savingsContributedMinor,
      savingsTargetMinor,
      totalBalanceMinor,
      dataLoading,
      dataError,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

function cryptoId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error('useFinance must be used inside a FinanceProvider');
  }

  return context;
}
