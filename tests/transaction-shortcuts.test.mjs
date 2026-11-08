import assert from 'node:assert/strict';
import { test } from 'node:test';

import { preferredAccountId, quickCategories } from '../src/utils/transaction-shortcuts.ts';

const categories = ['Food', 'Transport', 'Accommodation', 'Airtime and data', 'Shopping'];
const transaction = (category, type = 'expense') => ({ type, category });

test('quick categories prioritize repeated expenses without including income or transfers', () => {
  const transactions = [transaction('Shopping'), transaction('Shopping'), transaction('Transport'),
    transaction('Food', 'income'), transaction('Food', 'income'), transaction('Food', 'income'),
    { type: 'transfer' }];
  assert.deepEqual(quickCategories(transactions, 'expense', categories),
    ['Shopping', 'Transport', 'Food', 'Accommodation']);
  assert.deepEqual(categories, ['Food', 'Transport', 'Accommodation', 'Airtime and data', 'Shopping']);
});

test('new users get predictable category shortcuts and ties keep the original order', () => {
  assert.deepEqual(quickCategories([], 'expense', categories), categories.slice(0, 4));
  assert.deepEqual(quickCategories([transaction('Transport'), transaction('Food')], 'expense', categories),
    categories.slice(0, 4));
  assert.deepEqual(quickCategories([transaction('Salary', 'income')], 'income', ['Allowance', 'Salary']),
    ['Salary', 'Allowance']);
});

test('remembered accounts are used unless an explicit account link overrides them', () => {
  const accounts = [{ id: 'cash' }, { id: 'bank' }];
  assert.equal(preferredAccountId(accounts, 'bank'), 'bank');
  assert.equal(preferredAccountId(accounts, 'bank', 'cash'), 'cash');
});

test('archived or deleted preferences fall back to an active account', () => {
  const accounts = [{ id: 'old', archived: true }, { id: 'cash' }, { id: 'bank' }];
  assert.equal(preferredAccountId(accounts, 'old'), 'cash');
  assert.equal(preferredAccountId(accounts, 'deleted'), 'cash');
  assert.equal(preferredAccountId(accounts, 'bank', 'old'), 'bank');
  assert.equal(preferredAccountId([{ id: 'old', archived: true }], 'old'), '');
  assert.equal(preferredAccountId([], 'bank'), '');
});
