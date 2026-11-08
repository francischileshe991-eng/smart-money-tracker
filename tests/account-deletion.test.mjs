import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeletionHandler } from '../supabase/functions/delete-account/handler.ts';

function setup({ validToken = true, validPassword = true, passwordOwner = 'alice', rateLimited = false,
  storageError = false, deletionError = false, files = [] } = {}) {
  const calls = [];
  let remaining = [...files];
  const user = { auth: {
    async getUser(token) {
      calls.push(['getUser', token]);
      return { data: { user: validToken ? { id: 'alice', email: 'alice@example.com' } : null }, error: validToken ? null : {} };
    },
    async signInWithPassword(credentials) {
      assert.equal(credentials.email, 'alice@example.com');
      assert.equal(credentials.password, 'correct-password');
      return { data: { user: validPassword ? { id: passwordOwner } : null }, error: validPassword ? null : { status: rateLimited ? 429 : 400 } };
    },
    async signOut() { calls.push(['signOut']); return { error: null }; },
  } };
  const admin = {
    storage: { from(bucket) {
      assert.equal(bucket, 'avatars');
      return {
        async list(prefix) {
          calls.push(['list', prefix]);
          return { data: remaining.slice(0, 100), error: storageError ? { message: 'Storage unavailable' } : null };
        },
        async remove(paths) { calls.push(['remove', paths]); remaining = remaining.filter((file) => !paths.includes(`alice/${file.name}`)); return { error: null }; },
      };
    } },
    auth: { admin: { async deleteUser(id, soft) {
      calls.push(['deleteUser', id, soft]); return { error: deletionError ? new Error('Database failed') : null };
    } } },
  };
  return { handler: createDeletionHandler(() => ({ user, admin })), calls };
}
const request = (body = { password: 'correct-password', confirmation: 'DELETE' }, token = 'valid-token') => new Request('https://functions.example/delete-account', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body),
});

test('requests require an authenticated user and explicit deletion confirmation', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(request(undefined, null))).status, 401);
  assert.equal((await handler(request({ password: 'correct-password', confirmation: 'yes' }))).status, 400);
  assert.equal((await handler(request({ confirmation: 'DELETE' }))).status, 400);
  assert.equal(calls.length, 0);
});

test('invalid bearer tokens cannot reach storage or account deletion', async () => {
  const { handler, calls } = setup({ validToken: false });
  assert.equal((await handler(request())).status, 401);
  assert.deepEqual(calls, [['getUser', 'valid-token']]);
});

test('wrong passwords and rate-limited reauthentication prevent deletion', async () => {
  for (const rateLimited of [false, true]) {
    const { handler, calls } = setup({ validPassword: false, rateLimited });
    assert.equal((await handler(request())).status, rateLimited ? 429 : 403);
    assert.ok(!calls.some(([action]) => action === 'deleteUser' || action === 'list'));
  }
});

test('client-supplied IDs are rejected and a mismatched verified identity cannot delete', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(request({ password: 'correct-password', confirmation: 'DELETE', userId: 'bob' }))).status, 400);
  assert.equal(calls.length, 0);
  const mismatch = setup({ passwordOwner: 'bob' });
  assert.equal((await mismatch.handler(request())).status, 403);
  assert.ok(!mismatch.calls.some(([action]) => action === 'deleteUser'));
});

test('successful deletion removes only the authenticated owner and uses hard deletion', async () => {
  const { handler, calls } = setup();
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: true });
  assert.deepEqual(calls.find(([action]) => action === 'deleteUser'), ['deleteUser', 'alice', false]);
  assert.equal(calls.at(-1)[0], 'signOut');
});

test('legacy avatar files are deleted in bounded batches before deleting the account', async () => {
  const files = Array.from({ length: 103 }, (_, index) => ({ id: String(index), name: `${index}.jpg` }));
  const { handler, calls } = setup({ files });
  assert.equal((await handler(request())).status, 200);
  const removals = calls.filter(([action]) => action === 'remove');
  assert.equal(removals.length, 2);
  assert.equal(removals[0][1].length, 100);
  assert.equal(removals[1][1].length, 3);
  assert.ok(removals.flatMap(([, paths]) => paths).every((path) => path.startsWith('alice/')));
  assert.ok(calls.findIndex(([action]) => action === 'deleteUser') > calls.findIndex(([action]) => action === 'remove'));
});

test('storage failures preserve the account and revoke the verification session', async () => {
  const { handler, calls } = setup({ storageError: true });
  const response = await handler(request());
  assert.equal(response.status, 500);
  assert.ok(!calls.some(([action]) => action === 'deleteUser'));
  assert.equal(calls.at(-1)[0], 'signOut');
  assert.ok(!(await response.text()).includes('Storage unavailable'));
});

test('failed account deletion never reports success and still revokes the temporary session', async () => {
  const { handler, calls } = setup({ deletionError: true });
  const response = await handler(request());
  assert.equal(response.status, 500);
  assert.equal(calls.at(-1)[0], 'signOut');
});

test('preflight and unsupported methods never trigger authenticated actions', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(new Request('https://functions.example', { method: 'OPTIONS' }))).status, 204);
  assert.equal((await handler(new Request('https://functions.example'))).status, 405);
  assert.equal(calls.length, 0);
});
