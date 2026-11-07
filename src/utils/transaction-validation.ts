import { categoriesFor } from '../data/categories';
import type { Category, TransactionType } from '../types/finance';
import { parseAmountToMinor } from './currency';
import { isValidIsoDate } from './date';

export type TransactionValidationErrors = {
  amount?: string;
  title?: string;
  date?: string;
  account?: string;
  fromAccount?: string;
  toAccount?: string;
  category?: string;
};

export type TransactionValidationInput = {
  type: TransactionType;
  amount: string;
  title: string;
  category: Category;
  date: string;
  accountId: string;
  fromAccountId: string;
  toAccountId: string;
  accountIds: readonly string[];
};

export type TransactionValidationResult = {
  errors: TransactionValidationErrors;
  amountMinor: number | null;
  title: string;
};

/**
 * Validates a transaction before it reaches the ledger. Shared by the form and
 * the automated financial checks, so invalid or incomplete records are rejected
 * with the same rules everywhere.
 */
export function validateTransactionInput(
  input: TransactionValidationInput
): TransactionValidationResult {
  const amountMinor = parseAmountToMinor(input.amount);
  const title = input.title.trim();
  const knownAccountIds = new Set(input.accountIds);
  const errors: TransactionValidationErrors = {};

  if (amountMinor === null || amountMinor <= 0) {
    errors.amount = 'Enter an amount greater than zero, for example 250.00.';
  }

  if (title.length === 0) {
    errors.title = 'Enter a short description.';
  }

  if (!isValidIsoDate(input.date)) {
    errors.date = 'Choose a valid date.';
  }

  if (input.type === 'transfer') {
    if (!knownAccountIds.has(input.fromAccountId)) {
      errors.fromAccount = 'Choose the account the money leaves.';
    }

    if (!knownAccountIds.has(input.toAccountId)) {
      errors.toAccount = 'Choose the account the money enters.';
    } else if (input.fromAccountId === input.toAccountId) {
      errors.toAccount = 'Choose a different destination account.';
    }
  } else {
    if (!knownAccountIds.has(input.accountId)) {
      errors.account = 'Choose an account.';
    }

    if (!categoriesFor(input.type).includes(input.category)) {
      errors.category = 'Choose a category.';
    }
  }

  return { errors, amountMinor, title };
}
