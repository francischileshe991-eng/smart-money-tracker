import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import * as Network from 'expo-network';

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
import { emptySnapshot, serializeSnapshot, type FinanceSnapshot, type LocalFinanceSnapshot } from '@/data/finance-snapshot';
import { clearLocalSnapshot, loadLocalSnapshot, saveLocalSnapshot } from '@/data/local-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decideSyncAction } from '@/data/sync-decision';
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

export type SyncStatus = 'idle' | 'offline' | 'syncing' | 'synced' | 'pending' | 'conflict' | 'error';
export type ConflictStrategy = 'keep-local' | 'use-cloud';

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
  clearDeviceData: () => Promise<void>;
  dataLoading: boolean;
  dataError: string | null;
  reloadData: () => void;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  isOnline: boolean;
  pendingChanges: boolean;
  retrySync: () => void;
  resolveConflict: (strategy: ConflictStrategy) => Promise<void>;
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

function isNetworkOnline(state: Network.NetworkState | null): boolean {
  if (!state) return true;
  if (state.type === Network.NetworkStateType.NONE) return false;
  if (state.isInternetReachable === false) return false;
  if (state.isConnected === false && state.type !== Network.NetworkStateType.UNKNOWN) return false;
  return true;
}

function describeError(cause: unknown, fallback: string): string {
  if (cause instanceof Error) return cause.message;
  if (cause && typeof cause === 'object' && 'message' in cause) {
    const error = cause as { message?: unknown; code?: unknown; details?: unknown };
    const message = typeof error.message === 'string' ? error.message : '';
    const details = typeof error.details === 'string' ? error.details : '';
    const code = typeof error.code === 'string' ? ` (${error.code})` : '';
    const detailText = details && details !== message ? ` — ${details}` : '';
    if (message) return `${message}${detailText}${code}`;
  }
  return fallback;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, undefined, createInitialState);
  const { user } = useAuth();
  const userId = user?.id;
  const [dataErrorState, setDataErrorState] = useState<{ userId: string | undefined; error: string | null }>({
    userId,
    error: null,
  });
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const snapshot = useMemo<FinanceSnapshot>(
    () => ({
      accounts: state.accounts,
      transactions: state.transactions,
      budgets: state.budgets,
      savingsGoals: state.savingsGoals,
    }),
    [state.accounts, state.transactions, state.budgets, state.savingsGoals]
  );
  const snapshotJson = useMemo(() => serializeSnapshot(snapshot), [snapshot]);

  const snapshotRef = useRef<FinanceSnapshot>(snapshot);
  const persistedJsonRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const syncReconciledRef = useRef(false);
  const forceSyncRef = useRef(false);
  const onlineRef = useRef(true);
  const syncingRef = useRef(false);
  const syncAgainRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const clearingDeviceDataRef = useRef(false);
  const mutationVersionRef = useRef(0);
  const userIdRef = useRef<string | undefined>(userId);
  const previousUserIdRef = useRef<string | undefined>(userId);
  const syncOwnerRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const runSyncRef = useRef<() => Promise<void>>(async () => {});
  const dataError = dataErrorState.userId === userId ? dataErrorState.error : null;
  const setDataError = useCallback((error: string | null) => {
    setDataErrorState({ userId: userIdRef.current, error });
  }, []);

  const dataLoading = Boolean(userId && readyUserId !== userId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    userIdRef.current = userId;
    if (previousUserIdRef.current === userId) return;
    previousUserIdRef.current = userId;
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    persistedJsonRef.current = null;
    snapshotRef.current = emptySnapshot();
    revisionRef.current = 0;
    dirtyRef.current = false;
    conflictRef.current = false;
    forceSyncRef.current = false;
    syncAgainRef.current = false;
    syncReconciledRef.current = false;
    mutationVersionRef.current = 0;
    clearingDeviceDataRef.current = false;
    onlineRef.current = true;
  }, [userId]);

  const enqueueLocalWrite = useCallback(
    (targetUserId: string, nextSnapshot: FinanceSnapshot, metadata: { revision: number; dirty: boolean }) => {
      if (clearingDeviceDataRef.current) return Promise.resolve(false);
      const write = localWriteQueueRef.current
        .catch(() => {})
        .then(() => clearingDeviceDataRef.current ? undefined : saveLocalSnapshot(targetUserId, nextSnapshot, metadata))
        .then(() => true)
        .catch((cause: unknown) => {
          if (mountedRef.current) {
            setSyncStatus('error');
            setSyncError(describeError(cause, 'Could not save data on this device.'));
          }
          return false;
        });
      localWriteQueueRef.current = write.then(() => undefined);
      return write;
    },
    []
  );

  const applySnapshot = useCallback(
    (targetUserId: string, nextSnapshot: FinanceSnapshot, metadata: { revision: number; dirty: boolean }) => {
      if (clearingDeviceDataRef.current) return;
      persistedJsonRef.current = serializeSnapshot(nextSnapshot);
      revisionRef.current = metadata.revision;
      dirtyRef.current = metadata.dirty;
      conflictRef.current = false;
      forceSyncRef.current = false;
      setPendingChanges(metadata.dirty);
      dispatch({ type: 'hydrate-data', data: nextSnapshot });
      void enqueueLocalWrite(targetUserId, nextSnapshot, metadata);
    },
    [enqueueLocalWrite]
  );

  const scheduleSync = useCallback((delay = 300) => {
    if (clearingDeviceDataRef.current) return;
    if (!userIdRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      void runSyncRef.current();
    }, delay);
  }, []);

  const runSync = useCallback(async () => {
    const targetUserId = userIdRef.current;
    const client = supabase;
    if (!targetUserId || !client || clearingDeviceDataRef.current) return;
    if (!syncReconciledRef.current) return;
    if (conflictRef.current) return;
    if (syncingRef.current) {
      if (syncOwnerRef.current === targetUserId) {
        syncAgainRef.current = true;
        return;
      }
    }
    if (!dirtyRef.current) return;

    syncingRef.current = true;
    syncOwnerRef.current = targetUserId;
    const snapshotToSave = snapshotRef.current;
    const json = serializeSnapshot(snapshotToSave);
    setSyncStatus('syncing');

    try {
      // Commit the dirty snapshot locally before attempting the network write.
      const savedLocally = await enqueueLocalWrite(targetUserId, snapshotToSave, {
        revision: revisionRef.current,
        dirty: true,
      });
      if (!mountedRef.current || userIdRef.current !== targetUserId || clearingDeviceDataRef.current) return;
      if (!savedLocally) throw new Error('Your changes could not be saved on this device. Sync was paused.');

      const expectedRevision = forceSyncRef.current ? null : revisionRef.current;
      const result = await saveFinanceData(client, snapshotToSave, expectedRevision);
      if (!mountedRef.current || userIdRef.current !== targetUserId || clearingDeviceDataRef.current) return;

      if (result.conflict) {
        conflictRef.current = true;
        setSyncStatus('conflict');
        setSyncError('This account was updated on another device. Choose which data to keep.');
        return;
      }

      forceSyncRef.current = false;
      revisionRef.current = result.revision;

      const latestSnapshot = snapshotRef.current;
      const stillCurrent = serializeSnapshot(latestSnapshot) === json;
      dirtyRef.current = !stillCurrent;
      setPendingChanges(!stillCurrent);
      setSyncError(null);
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus(stillCurrent ? 'synced' : 'pending');
      await enqueueLocalWrite(targetUserId, latestSnapshot, {
        revision: result.revision,
        dirty: !stillCurrent,
      });

      if (!stillCurrent) syncAgainRef.current = true;
    } catch (cause) {
      if (!mountedRef.current || userIdRef.current !== targetUserId) return;
      const network = await Network.getNetworkStateAsync().catch(() => null);
      const online = isNetworkOnline(network);
      onlineRef.current = online;
      setIsOnline(online);
      setSyncStatus(online ? 'error' : 'offline');
      setSyncError(describeError(cause, 'Could not sync your changes.'));
    } finally {
      if (syncOwnerRef.current === targetUserId) {
        syncingRef.current = false;
        syncOwnerRef.current = null;
        if (syncAgainRef.current && !conflictRef.current && mountedRef.current) {
          syncAgainRef.current = false;
          scheduleSync(50);
        }
      }
    }
  }, [enqueueLocalWrite, scheduleSync]);

  useEffect(() => {
    runSyncRef.current = runSync;
  }, [runSync]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const targetUserId = userId;
    syncReconciledRef.current = false;
    void (async () => {
      await localWriteQueueRef.current.catch(() => {});

      let local: LocalFinanceSnapshot | null = null;
      try {
        local = await loadLocalSnapshot(targetUserId);
      } catch {
        if (active) setDataError('Could not read the data saved on this device.');
      }
      if (!active || userIdRef.current !== targetUserId) return;

      if (local) {
        applySnapshot(targetUserId, local, { revision: local.revision, dirty: local.dirty });
        setLastSyncedAt(local.dirty ? null : local.updatedAt);
        setReadyUserId(targetUserId);
      }

      const client = supabase;
      if (!client) {
        if (!local && active) {
          applySnapshot(targetUserId, emptySnapshot(), { revision: 0, dirty: false });
          setReadyUserId(targetUserId);
          setSyncStatus('idle');
        }
        syncReconciledRef.current = true;
        return;
      }

      const mutationVersion = mutationVersionRef.current;

      try {
        const remote = await loadFinanceData(client, targetUserId);
        if (!active || userIdRef.current !== targetUserId) return;

        const changedSinceStart = mutationVersionRef.current !== mutationVersion;
        const localMeta = local
          ? { revision: revisionRef.current, dirty: dirtyRef.current || changedSinceStart }
          : null;
        const decision = decideSyncAction({ local: localMeta, remote });
        syncReconciledRef.current = true;

        switch (decision.type) {
          case 'adopt-remote':
            applySnapshot(targetUserId, remote.snapshot, { revision: remote.revision, dirty: false });
            setSyncStatus('synced');
            setSyncError(null);
            setLastSyncedAt(remote.hasData ? new Date().toISOString() : null);
            break;
          case 'push':
            dirtyRef.current = true;
            setPendingChanges(true);
            setSyncStatus('pending');
            scheduleSync(0);
            break;
          case 'conflict':
            conflictRef.current = true;
            setSyncStatus('conflict');
            setSyncError('This account was updated on another device. Choose which data to keep.');
            break;
          case 'noop':
            if (!local) {
              applySnapshot(targetUserId, remote.snapshot, { revision: remote.revision, dirty: false });
            }
            setSyncStatus('synced');
            setSyncError(null);
            break;
        }

        if (!local) setReadyUserId(targetUserId);
      } catch (cause) {
        if (!active || userIdRef.current !== targetUserId) return;

        const network = await Network.getNetworkStateAsync().catch(() => null);
        onlineRef.current = isNetworkOnline(network);
        setIsOnline(onlineRef.current);

        if (!local) {
          applySnapshot(targetUserId, emptySnapshot(), { revision: 0, dirty: false });
          setReadyUserId(targetUserId);
        }

        setSyncStatus(onlineRef.current ? 'error' : 'offline');
        setSyncError(describeError(cause, 'Could not reach the cloud. Working offline.'));
        syncReconciledRef.current = true;
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, loadAttempt, applySnapshot, scheduleSync, setDataError]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const handleNetworkChange = (network: Network.NetworkState) => {
      if (!active) return;
      const wasOnline = onlineRef.current;
      const online = isNetworkOnline(network);
      onlineRef.current = online;
      setIsOnline(online);

      if (online) {
        if (dirtyRef.current && !conflictRef.current) scheduleSync(0);
        else if (!wasOnline) {
          setSyncStatus('syncing');
          setLoadAttempt((attempt) => attempt + 1);
        }
      } else {
        setSyncStatus('offline');
      }
    };

    void Network.getNetworkStateAsync().then(handleNetworkChange).catch(() => {});
    const subscription = Network.addNetworkStateListener(handleNetworkChange);

    return () => {
      active = false;
      subscription.remove();
    };
  }, [userId, scheduleSync]);

  useEffect(() => {
    if (!userId || !state.ready || readyUserId !== userId) return;
    if (snapshotJson === persistedJsonRef.current) return;

    persistedJsonRef.current = snapshotJson;
    dirtyRef.current = true;
    setPendingChanges(true);
    void enqueueLocalWrite(userId, snapshotRef.current, { revision: revisionRef.current, dirty: true });
    scheduleSync(350);
  }, [snapshotJson, state.ready, readyUserId, userId, enqueueLocalWrite, scheduleSync]);

  const mutate = useCallback((action: FinanceAction) => {
    if (clearingDeviceDataRef.current) return;
    mutationVersionRef.current += 1;
    dispatch(action);
  }, []);

  const clearDeviceData = useCallback(async () => {
    const owner = userIdRef.current;
    if (!owner) return;
    clearingDeviceDataRef.current = true;
    syncAgainRef.current = false;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = null;
    // Drain earlier writes before clearing, and block late network responses from re-caching data.
    await localWriteQueueRef.current.catch(() => {});
    await clearLocalSnapshot(owner);
    await AsyncStorage.removeItem(`smart-money-tracker:last-transaction-account:${owner}`);
  }, []);

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

  const retrySync = useCallback(() => {
    if (!userIdRef.current) return;
    if (conflictRef.current) return;
    setSyncError(null);
    if (dirtyRef.current) {
      setSyncStatus('pending');
      scheduleSync(0);
      return;
    }
    setSyncStatus('syncing');
    setLoadAttempt((attempt) => attempt + 1);
  }, [scheduleSync]);

  const resolveConflict = useCallback(
    async (strategy: ConflictStrategy) => {
      const targetUserId = userIdRef.current;
      const client = supabase;
      if (!targetUserId || !client) return;

      setSyncError(null);

      if (strategy === 'keep-local') {
        conflictRef.current = false;
        forceSyncRef.current = true;
        dirtyRef.current = true;
        setPendingChanges(true);
        setSyncStatus('pending');
        await runSyncRef.current();
        return;
      }

      setSyncStatus('syncing');
      try {
        const remote = await loadFinanceData(client, targetUserId);
        if (!mountedRef.current || userIdRef.current !== targetUserId) return;
        applySnapshot(targetUserId, remote.snapshot, { revision: remote.revision, dirty: false });
        setSyncStatus('synced');
        setSyncError(null);
        setLastSyncedAt(new Date().toISOString());
      } catch (cause) {
        if (!mountedRef.current || userIdRef.current !== targetUserId) return;
        setSyncStatus('error');
        setSyncError(cause instanceof Error ? cause.message : 'Could not load the cloud copy.');
      }
    },
    [applySnapshot]
  );

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
      clearDeviceData,
      addAccount: (account) => mutate({ type: 'add-account', account }),
      updateAccount: (id, account) => mutate({ type: 'update-account', id, account }),
      archiveAccount: (id) => mutate({ type: 'archive-account', id }),
      restoreAccount: (id) => mutate({ type: 'restore-account', id }),
      deleteAccount: (id) => {
        if (
          !state.accounts.some((account) => account.id === id) ||
          state.transactions.some((transaction) => transactionReferencesAccount(transaction, id))
        ) {
          return false;
        }

        mutate({ type: 'delete-account', id });
        return true;
      },
      addTransaction: (transaction) => {
        if (!transactionHasValidAccounts(transaction, state.accounts)) {
          return false;
        }

        mutate({ type: 'add-transaction', transaction });
        return true;
      },
      updateTransaction: (id, transaction) => {
        if (
          !state.transactions.some((item) => item.id === id) ||
          !transactionHasValidAccounts(transaction, state.accounts, true)
        ) {
          return false;
        }

        mutate({ type: 'update-transaction', id, transaction });
        return true;
      },
      deleteTransaction: (id) => mutate({ type: 'delete-transaction', id }),
      saveBudget: (budget, id) => {
        if (budget.limitMinor <= 0 || state.budgets.some((item) => item.category === budget.category && item.id !== id)) return false;
        if (budget.period === 'custom' && (!budget.startDate || !budget.endDate || budget.startDate > budget.endDate)) return false;
        mutate({ type: 'save-budget', budget, id });
        return true;
      },
      deleteBudget: (id) => mutate({ type: 'delete-budget', id }),
      saveGoal: (goal, id) => {
        if (!goal.name.trim() || goal.targetMinor <= 0) return false;
        mutate({ type: 'save-goal', goal, id });
        return true;
      },
      deleteGoal: (id) => mutate({ type: 'delete-goal', id }),
      recordGoalContribution: (goalId, amountMinor, type) => {
        const goal = state.savingsGoals.find((item) => item.id === goalId);
        if (!goal || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || (type === 'withdrawal' && amountMinor > goal.contributedMinor)) return false;
        const event: SavingsGoalContribution = { id: cryptoId(), amountMinor, type, date: new Date().toISOString().slice(0, 10) };
        mutate({ type: 'goal-contribution', goalId, event });
        return true;
      },
      setGoalCompleted: (id, completed) => mutate({ type: 'complete-goal', id, completed }),
      resetData: () => {
        forceSyncRef.current = true;
        mutate({ type: 'reset-data' });
      },
      dataLoading,
      dataError,
      reloadData: () => {
        setDataError(null);
        setSyncStatus('syncing');
        setLoadAttempt((attempt) => attempt + 1);
      },
      syncStatus,
      syncError,
      lastSyncedAt,
      isOnline,
      pendingChanges,
      retrySync,
      resolveConflict,
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
      syncStatus,
      syncError,
      lastSyncedAt,
      isOnline,
      pendingChanges,
      retrySync,
      resolveConflict,
      setDataError,
      mutate,
      clearDeviceData,
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
