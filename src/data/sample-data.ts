import type { Account, Budget, SavingsGoal, Transaction } from '@/types/finance';
import { daysAgoIso } from '@/utils/date';

/**
 * Realistic ZMW sample data used until persistence is introduced.
 * Values are integer ngwee; dates are generated relative to today so the
 * sample always feels current.
 */

export const SAMPLE_ACCOUNTS: Account[] = [
  {
    id: 'account-cash',
    name: 'Cash',
    type: 'cash',
    openingBalanceMinor: 120_000,
  },
  {
    id: 'account-bank',
    name: 'Main bank',
    type: 'bank',
    openingBalanceMinor: 68_050,
  },
  {
    id: 'account-mtn',
    name: 'MTN Mobile Money',
    type: 'mtn_money',
    openingBalanceMinor: 150_000,
  },
  {
    id: 'account-airtel',
    name: 'Airtel Money',
    type: 'airtel_money',
    openingBalanceMinor: 45_000,
  },
];

const sampleTransactions = [
  {
    id: 'txn-sample-01',
    type: 'income',
    title: 'Monthly salary',
    category: 'Salary',
    amountMinor: 1_250_000,
    date: daysAgoIso(5),
    note: 'November salary',
    accountId: 'account-bank',
  },
  {
    id: 'txn-sample-02',
    type: 'expense',
    title: 'Apartment rent',
    category: 'Accommodation',
    amountMinor: 320_000,
    date: daysAgoIso(4),
    accountId: 'account-bank',
  },
  {
    id: 'txn-sample-03',
    type: 'income',
    title: 'Dividend payment',
    category: 'Other income',
    amountMinor: 35_000,
    date: daysAgoIso(6),
    accountId: 'account-bank',
  },
  {
    id: 'txn-sample-04',
    type: 'expense',
    title: 'Weekly groceries',
    category: 'Food',
    amountMinor: 84_550,
    date: daysAgoIso(2),
    note: 'Shoprite run',
    accountId: 'account-mtn',
  },
  {
    id: 'txn-sample-05',
    type: 'income',
    title: 'Website redesign',
    category: 'Freelance',
    amountMinor: 240_000,
    date: daysAgoIso(1),
    accountId: 'account-bank',
  },
  {
    id: 'txn-sample-06',
    type: 'expense',
    title: 'Fuel and bus fare',
    category: 'Transport',
    amountMinor: 32_000,
    date: daysAgoIso(1),
    accountId: 'account-cash',
  },
  {
    id: 'txn-sample-07',
    type: 'expense',
    title: 'Home fibre',
    category: 'Utilities',
    amountMinor: 45_000,
    date: daysAgoIso(3),
    accountId: 'account-bank',
  },
  {
    id: 'txn-sample-08',
    type: 'expense',
    title: 'Prepaid electricity',
    category: 'Utilities',
    amountMinor: 28_000,
    date: daysAgoIso(5),
    accountId: 'account-mtn',
  },
  {
    id: 'txn-sample-09',
    type: 'expense',
    title: 'Lunch with colleagues',
    category: 'Food',
    amountMinor: 36_500,
    date: daysAgoIso(0),
    accountId: 'account-cash',
  },
  {
    id: 'txn-sample-10',
    type: 'expense',
    title: 'Mobile airtime',
    category: 'Airtime and data',
    amountMinor: 10_000,
    date: daysAgoIso(2),
    accountId: 'account-airtel',
  },
  {
    id: 'txn-sample-11',
    type: 'expense',
    title: 'Gym membership',
    category: 'Healthcare',
    amountMinor: 25_000,
    date: daysAgoIso(0),
    accountId: 'account-bank',
  },
  {
    id: 'txn-sample-12',
    type: 'expense',
    title: 'Winter clothing',
    category: 'Shopping',
    amountMinor: 62_000,
    date: daysAgoIso(3),
    accountId: 'account-bank',
  },
  {
    id: 'txn-sample-13',
    type: 'transfer',
    title: 'Mobile money top-up',
    amountMinor: 50_000,
    date: daysAgoIso(3),
    note: 'Moved funds for groceries',
    fromAccountId: 'account-bank',
    toAccountId: 'account-mtn',
  },
  {
    id: 'txn-sample-14',
    type: 'transfer',
    title: 'Cash withdrawal',
    amountMinor: 30_000,
    date: daysAgoIso(1),
    fromAccountId: 'account-bank',
    toAccountId: 'account-cash',
  },
] satisfies Transaction[];

/** Newest first, so the dashboard and list screens share one ordering. */
export const SAMPLE_TRANSACTIONS: Transaction[] = sampleTransactions
  .slice()
  .sort((a, b) => b.date.localeCompare(a.date));

export const SAMPLE_BUDGETS: Budget[] = [
  { id: 'budget-01', category: 'Food', limitMinor: 120_000 },
  { id: 'budget-02', category: 'Transport', limitMinor: 60_000 },
  { id: 'budget-03', category: 'Accommodation', limitMinor: 320_000 },
  { id: 'budget-04', category: 'Airtime and data', limitMinor: 30_000 },
  { id: 'budget-05', category: 'Entertainment', limitMinor: 40_000 },
  { id: 'budget-06', category: 'Personal care', limitMinor: 25_000 },
  { id: 'budget-07', category: 'Shopping', limitMinor: 75_000 },
  { id: 'budget-08', category: 'Utilities', limitMinor: 80_000 },
  { id: 'budget-09', category: 'Healthcare', limitMinor: 40_000 },
];

/**
 * Sample savings goals. Goal management arrives in the savings-goals phase.
 */
export const SAMPLE_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal-01',
    name: 'Laptop',
    targetMinor: 900_000,
    contributedMinor: 320_000,
  },
  {
    id: 'goal-02',
    name: 'Emergency fund',
    targetMinor: 250_000,
    contributedMinor: 90_000,
  },
  {
    id: 'goal-03',
    name: 'Tuition',
    targetMinor: 600_000,
    contributedMinor: 150_000,
  },
];
