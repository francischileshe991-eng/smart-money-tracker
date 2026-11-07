export type TransactionType = 'income' | 'expense' | 'transfer';

export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Accommodation'
  | 'Airtime and data'
  | 'Education'
  | 'Entertainment'
  | 'Shopping'
  | 'Healthcare'
  | 'Personal care'
  | 'Utilities'
  | 'Other expenses';

export type IncomeCategory =
  | 'Allowance'
  | 'Salary'
  | 'Freelance'
  | 'Business'
  | 'Scholarship'
  | 'Gifts'
  | 'Other income';

export type Category = ExpenseCategory | IncomeCategory;

export type AccountType = 'cash' | 'bank' | 'mtn_money' | 'airtel_money' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Integer opening balance in ngwee. */
  openingBalanceMinor: number;
  archived?: boolean;
}

export type NewAccount = Omit<Account, 'id' | 'archived'>;

export interface AccountWithBalance extends Account {
  /** Current balance in ngwee, derived from opening balance and transactions. */
  balanceMinor: number;
}

interface TransactionBase {
  id: string;
  /** Short description shown in lists. */
  title: string;
  /** Integer amount in ngwee. Always positive; `type` determines direction. */
  amountMinor: number;
  /** ISO calendar date (YYYY-MM-DD). */
  date: string;
  note?: string;
}

export interface IncomeTransaction extends TransactionBase {
  type: 'income';
  category: IncomeCategory;
  accountId: string;
}

export interface ExpenseTransaction extends TransactionBase {
  type: 'expense';
  category: ExpenseCategory;
  accountId: string;
}

export interface TransferTransaction extends TransactionBase {
  type: 'transfer';
  fromAccountId: string;
  toAccountId: string;
}

export type Transaction = IncomeTransaction | ExpenseTransaction | TransferTransaction;

export type NewTransaction =
  | Omit<IncomeTransaction, 'id'>
  | Omit<ExpenseTransaction, 'id'>
  | Omit<TransferTransaction, 'id'>;

export interface Budget {
  id: string;
  category: ExpenseCategory;
  /** Integer limit in ngwee for the selected period. */
  limitMinor: number;
  period?: 'monthly' | 'custom';
  startDate?: string;
  endDate?: string;
  warningThreshold?: number;
}

export interface BudgetWithSpending extends Budget {
  spentMinor: number;
  remainingMinor: number;
  progress: number;
  warning: 'none' | 'near' | 'over';
}

export interface SavingsGoal {
  id: string;
  name: string;
  /** Integer target amount in ngwee. */
  targetMinor: number;
  /** Integer amount contributed so far, in ngwee. */
  contributedMinor: number;
  /** Optional ISO target date (YYYY-MM-DD). */
  targetDate?: string;
  completed?: boolean;
  history?: SavingsGoalContribution[];
}

export interface SavingsGoalContribution {
  id: string;
  amountMinor: number;
  type: 'contribution' | 'withdrawal';
  date: string;
}
