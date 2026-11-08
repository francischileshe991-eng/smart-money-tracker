import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';

import { loadFinanceData, saveFinanceData } from '../src/data/finance-repository.ts';
import { emptySnapshot } from '../src/data/finance-snapshot.ts';
import { calculateAccountBalances } from '../src/utils/finance.ts';

const owner = 'owner';
const id = (index) => String(index).padStart(6, '0');
const fixture = (count = 1) => ({
  accounts: [{ id: 'cash', user_id: owner, name: 'Cash', type: 'cash', opening_balance_minor: 100000, archived: false }],
  categories: [{ id: 'food', user_id: owner, name: 'Food' }],
  transactions: Array.from({ length: count }, (_, index) => ({
    id: id(index), user_id: owner, title: `Meal ${index}`, type: 'expense',
    amount_minor: 1, transaction_date: '2026-11-08', category_id: 'food', account_id: 'cash',
  })).reverse(),
  budgets: [{ id: 'budget', user_id: owner, category_id: 'food', limit_minor: 10000, period: 'monthly', warning_threshold: 80 }],
  savings_goals: [{ id: 'goal', user_id: owner, name: 'Laptop', target_minor: 100000, completed: false }],
  goal_contributions: Array.from({ length: count }, (_, index) => ({
    id: id(index), user_id: owner, goal_id: 'goal', amount_minor: 2,
    type: index === 0 ? 'withdrawal' : 'contribution', contribution_date: '2026-11-08',
  })).reverse(),
});

// Exercise the real Supabase query builder against an in-memory REST endpoint.
// No credentials, network access, or database writes are needed.
function server({ tables = fixture(), cap = 1000, revisions = [7, 7], failPage, rpc } = {}) {
  const requests = [];
  let revisionReads = 0;
  const client = createClient('https://finance-tests.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(input);
        const table = url.pathname.split('/').at(-1);
        const body = init?.body ? JSON.parse(init.body) : null;
        requests.push({ table, url, body });
        const respond = (data, status = 200) => new Response(JSON.stringify(data), {
          status, headers: { 'Content-Type': 'application/json' },
        });
        if (url.pathname.includes('/rpc/')) {
          return respond(rpc?.data ?? { conflict: false, revision: 8 }, rpc?.status ?? 200);
        }
        assert.equal(url.searchParams.get('user_id'), `eq.${owner}`);
        if (table === 'finance_sync_state') {
          const revision = revisions[Math.min(revisionReads++, revisions.length - 1)];
          return respond(revision === null ? [] : [{ revision }]);
        }
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const limit = Number(url.searchParams.get('limit') ?? cap);
        if (failPage?.(table, offset)) {
          return respond({ code: '42501', message: 'Page denied' }, 403);
        }
        let rows = [...(tables[table] ?? [])].filter((row) => row.user_id === owner);
        const order = url.searchParams.get('order')?.split(',') ?? [];
        rows.sort((left, right) => {
          for (const term of order) {
            const [column, direction] = term.split('.');
            if (left[column] === right[column]) continue;
            return (left[column] < right[column] ? -1 : 1) * (direction === 'desc' ? -1 : 1);
          }
          return 0;
        });
        rows = rows.slice(offset, offset + Math.min(limit, cap));
        return respond(rows);
      },
    },
  });
  return { client, requests };
}

test('loads more than 1,000 same-date transactions and contributions without losing money', async () => {
  const { client, requests } = server({ tables: fixture(1201), cap: 137 });
  const { snapshot, revision, hasData } = await loadFinanceData(client, owner);
  assert.equal(revision, 7);
  assert.equal(hasData, true);
  assert.equal(snapshot.transactions.length, 1201);
  assert.equal(new Set(snapshot.transactions.map((row) => row.id)).size, 1201);
  assert.equal(snapshot.transactions[0].id, id(0));
  assert.equal(snapshot.transactions.at(-1).id, id(1200));
  assert.equal(snapshot.transactions[0].category, 'Food');
  assert.equal(calculateAccountBalances(snapshot.accounts, snapshot.transactions)[0].balanceMinor, 98799);
  assert.equal(snapshot.savingsGoals[0].history.length, 1201);
  assert.equal(snapshot.savingsGoals[0].contributedMinor, 2398);
  const transactionRequests = requests.filter((request) => request.table === 'transactions');
  assert.equal(transactionRequests[0].url.searchParams.get('order'), 'transaction_date.desc,id.asc');
  assert.equal(transactionRequests[1].url.searchParams.get('offset'), '137');
  assert.equal(transactionRequests.at(-1).url.searchParams.get('offset'), '1201');
});

test('paginates accounts, categories, budgets, and goals as well as their histories', async () => {
  const tables = fixture(3);
  for (const table of ['accounts', 'categories', 'budgets', 'savings_goals']) {
    tables[table] = Array.from({ length: 3 }, (_, index) => ({ ...tables[table][0], id: `${table}-${index}` }));
  }
  tables.categories[2].name = 'Transport';
  tables.transactions.forEach((row) => {
    row.category_id = 'categories-2';
    row.account_id = 'accounts-2';
  });
  tables.budgets.forEach((row) => { row.category_id = 'categories-2'; });
  tables.goal_contributions.forEach((row) => { row.goal_id = 'savings_goals-2'; });
  const { snapshot } = await loadFinanceData(server({ tables, cap: 1 }).client, owner);
  assert.equal(snapshot.accounts.length, 3);
  assert.equal(snapshot.budgets.length, 3);
  assert.equal(snapshot.savingsGoals.length, 3);
  assert.equal(snapshot.transactions[0].category, 'Transport');
  assert.equal(snapshot.budgets[0].category, 'Transport');
  assert.equal(snapshot.savingsGoals[2].history.length, 3);
});

test('empty cloud data completes without pagination loops', async () => {
  const { client, requests } = server({ tables: {}, revisions: [null, null] });
  const result = await loadFinanceData(client, owner);
  assert.deepEqual(result, { snapshot: emptySnapshot(), revision: 0, hasData: false });
  assert.equal(requests.length, 8);
});

test('an exact full page still checks for further records', async () => {
  const { client, requests } = server({ tables: fixture(500) });
  assert.equal((await loadFinanceData(client, owner)).snapshot.transactions.length, 500);
  assert.deepEqual(requests.filter((request) => request.table === 'transactions')
    .map((request) => Number(request.url.searchParams.get('offset'))), [0, 500]);
});

test('transaction order remains descending by date with ID as a tie breaker', async () => {
  const tables = fixture(3);
  tables.transactions.find((row) => row.id === id(1)).transaction_date = '2026-11-09';
  const { snapshot } = await loadFinanceData(server({ tables, cap: 1 }).client, owner);
  assert.deepEqual(snapshot.transactions.map((row) => row.id), [id(1), id(0), id(2)]);
});

test('a later page failure rejects the entire snapshot and a retry reloads it completely', async () => {
  let shouldFail = true;
  const { client } = server({ tables: fixture(3), cap: 1,
    failPage: (table, offset) => shouldFail && table === 'transactions' && offset === 1 });
  await assert.rejects(loadFinanceData(client, owner), { message: 'Page denied' });
  shouldFail = false;
  assert.equal((await loadFinanceData(client, owner)).snapshot.transactions.length, 3);
});

test('a cloud revision change during pagination rejects a potentially mixed snapshot', async () => {
  const { client } = server({ tables: fixture(3), cap: 1, revisions: [7, 8] });
  await assert.rejects(loadFinanceData(client, owner), /cloud data changed while it was loading/);
});

test('snapshot saves preserve record IDs and expected revision across retries', async () => {
  const { client, requests } = server();
  const snapshot = { ...emptySnapshot(), transactions: [{ id: 'stable-id', amountMinor: 101 }] };
  assert.deepEqual(await saveFinanceData(client, snapshot, 7), { conflict: false, revision: 8 });
  await saveFinanceData(client, snapshot, 7);
  assert.deepEqual(requests[0].body, requests[1].body);
  assert.equal(requests[0].body.p_expected_revision, 7);
  assert.equal(requests[0].body.p_transactions[0].id, 'stable-id');
});

test('save conflicts are surfaced without silently forcing an overwrite', async () => {
  const { client, requests } = server({ rpc: { data: [{ conflict: true, revision: 9 }] } });
  assert.deepEqual(await saveFinanceData(client, emptySnapshot(), 7), { conflict: true, revision: 9 });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.p_expected_revision, 7);
});

test('explicit keep-local resolution can send a forced save', async () => {
  const { client, requests } = server();
  await saveFinanceData(client, emptySnapshot(), null);
  assert.equal(requests[0].body.p_expected_revision, null);
});

test('failed saves propagate the server error for retry handling', async () => {
  const { client } = server({ rpc: { data: { code: '42501', message: 'Save denied' }, status: 403 } });
  await assert.rejects(saveFinanceData(client, emptySnapshot(), 7), { message: 'Save denied' });
});
