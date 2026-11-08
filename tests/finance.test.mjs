import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatAmountInput, formatMoney, parseAmountToMinor } from '../src/utils/currency.ts';
import {
  calculateAccountBalances,
  calculateBudgetSpending,
  calculateTotalBalance,
  sumExpenseMinor,
  sumIncomeMinor,
  transactionHasValidAccounts,
  transactionReferencesAccount,
} from '../src/utils/finance.ts';

const accounts = [
  { id: 'cash', name: 'Cash', type: 'cash', openingBalanceMinor: 10000 },
  { id: 'bank', name: 'Bank', type: 'bank', openingBalanceMinor: 20000 },
  { id: 'old', name: 'Old', type: 'other', openingBalanceMinor: 5000, archived: true },
];
const expense = (amountMinor, date = '2026-11-08', category = 'Food') => ({
  id: 'expense', title: 'Lunch', type: 'expense', amountMinor, date, category, accountId: 'cash',
});
const income = { id: 'income', title: 'Pay', type: 'income', amountMinor: 10001, date: '2026-11-08', category: 'Salary', accountId: 'bank' };
const transfer = { id: 'transfer', title: 'Top up', type: 'transfer', amountMinor: 3001, date: '2026-11-08', fromAccountId: 'bank', toAccountId: 'cash' };

test('money input and display preserve ngwee without decimal rounding', () => {
  for (const [input, minor, display] of [
    ['0.01', 1, 'K0.01'], ['0.10', 10, 'K0.10'], ['1,234.56', 123456, 'K1,234.56'],
    [' 42.5 ', 4250, 'K42.50'], ['999999999.99', 99999999999, 'K999,999,999.99'],
  ]) {
    assert.equal(parseAmountToMinor(input), minor);
    assert.equal(formatMoney(minor), display);
    assert.equal(parseAmountToMinor(formatAmountInput(minor)), minor);
  }
  assert.equal(formatMoney(-123456), '-K1,234.56');
  for (const input of ['', '-1', '1.001', '1e3', 'Infinity', 'NaN', '1000000000', 'K10']) {
    assert.equal(parseAmountToMinor(input), null, input);
  }
});

test('transfers preserve total wealth and never count as income or expenses', () => {
  const ledger = [income, expense(102), transfer];
  const balances = calculateAccountBalances(accounts, ledger);
  assert.deepEqual(balances.map((account) => account.balanceMinor), [12899, 27000, 5000]);
  assert.equal(sumIncomeMinor(ledger), 10001);
  assert.equal(sumExpenseMinor(ledger), 102);
  assert.equal(calculateTotalBalance(balances), 35000 + 10001 - 102);
  assert.equal(calculateTotalBalance(balances.filter((account) => !account.archived)), 39899);
});

test('editing and deleting transactions recalculates balances from the ledger', () => {
  assert.equal(calculateAccountBalances(accounts, [expense(100)])[0].balanceMinor, 9900);
  assert.equal(calculateAccountBalances(accounts, [expense(250)])[0].balanceMinor, 9750);
  assert.equal(calculateAccountBalances(accounts, [])[0].balanceMinor, 10000);
  const overdraft = calculateAccountBalances(accounts, [expense(10001)]);
  assert.equal(overdraft[0].balanceMinor, -1);
});

test('new transactions reject archived, missing, and identical transfer accounts', () => {
  assert.equal(transactionHasValidAccounts(transfer, accounts), true);
  assert.equal(transactionHasValidAccounts({ ...transfer, toAccountId: 'bank' }, accounts), false);
  assert.equal(transactionHasValidAccounts({ ...transfer, toAccountId: 'missing' }, accounts), false);
  assert.equal(transactionHasValidAccounts({ ...transfer, toAccountId: 'old' }, accounts), false);
  const historical = { ...expense(100), accountId: 'old' };
  assert.equal(transactionHasValidAccounts(historical, accounts), false);
  assert.equal(transactionHasValidAccounts(historical, accounts, true), true);
  assert.equal(transactionHasValidAccounts(expense(0), accounts), false);
  assert.equal(transactionReferencesAccount(transfer, 'cash'), true);
  assert.equal(transactionReferencesAccount(transfer, 'bank'), true);
  assert.equal(transactionReferencesAccount(transfer, 'old'), false);
});

test('monthly budgets count only matching expenses in the selected month', () => {
  const ledger = [expense(100, '2026-11-01'), expense(200, '2026-11-30'),
    expense(900, '2026-10-31'), expense(900, '2026-12-01'),
    expense(900, '2026-11-08', 'Transport'), income, transfer];
  const [budget] = calculateBudgetSpending([{ id: 'food', category: 'Food', limitMinor: 1000 }], ledger, '2026-11-08');
  assert.equal(budget.spentMinor, 300);
  assert.equal(budget.remainingMinor, 700);
  assert.equal(budget.warning, 'none');
});

test('custom budgets include both boundaries across months', () => {
  const [budget] = calculateBudgetSpending([{
    id: 'food', category: 'Food', limitMinor: 1000, period: 'custom',
    startDate: '2026-10-31', endDate: '2026-11-02',
  }], [expense(900, '2026-10-30'), expense(100, '2026-10-31'),
    expense(200, '2026-11-02'), expense(900, '2026-11-03')], '2026-11-08');
  assert.equal(budget.spentMinor, 300);
});

test('budget warnings follow the configured threshold and report overspending', () => {
  const budget = { id: 'food', category: 'Food', limitMinor: 1000, warningThreshold: 75 };
  for (const [spent, warning, remaining] of [[500, 'none', 500], [750, 'near', 250], [1000, 'near', 0], [1100, 'over', -100]]) {
    const [result] = calculateBudgetSpending([budget], [expense(spent)], '2026-11-08');
    assert.equal(result.warning, warning);
    assert.equal(result.remainingMinor, remaining);
  }
});
