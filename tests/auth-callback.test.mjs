import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAuthCallback, scrubAuthCallbackUrl } from '../src/utils/auth-callback.ts';

const destinations = ['smartmoneytracker://auth', 'smartmoneytracker://reset-password',
  'smartmoneytracker:///reset-password', 'https://money.example/auth', 'https://money.example/reset-password'];

test('browser history loses credentials while retaining unrelated query parameters', () => {
  assert.equal(scrubAuthCallbackUrl('https://money.example/auth?code=secret&next=home'), 'https://money.example/auth?next=home');
  assert.equal(scrubAuthCallbackUrl('https://money.example/reset-password#access_token=secret&refresh_token=secret&type=recovery'), 'https://money.example/reset-password');
});

test('native and web PKCE recovery links retain the password recovery intent', () => {
  for (const base of destinations.filter((url) => url.endsWith('reset-password'))) {
    assert.deepEqual(parseAuthCallback(`${base}?code=one-time-code`, destinations),
      { type: 'code', code: 'one-time-code', recovery: true });
  }
});

test('legacy native fragment tokens restore a recovery session', () => {
  assert.deepEqual(parseAuthCallback('smartmoneytracker://reset-password#access_token=access&refresh_token=refresh&type=recovery', destinations),
    { type: 'tokens', accessToken: 'access', refreshToken: 'refresh', recovery: true });
});

test('email confirmation codes do not restrict the user to password recovery', () => {
  assert.deepEqual(parseAuthCallback('smartmoneytracker://auth?code=signup-code', destinations),
    { type: 'code', code: 'signup-code', recovery: false });
});

test('untrusted origins, paths and protocols cannot inject session tokens', () => {
  for (const url of ['https://evil.example/reset-password?code=stolen', 'https://money.example/other?code=stolen',
    'http://money.example/auth?code=stolen', 'anotherapp://auth?code=stolen', 'smartmoneytracker://auth/other?code=stolen', 'invalid']) {
    assert.deepEqual(parseAuthCallback(url, destinations), { type: 'none' });
  }
});

test('expired links use safe feedback rather than reflecting server-provided text', () => {
  const parsed = parseAuthCallback('smartmoneytracker://auth#error=access_denied&error_description=internal-secret', destinations);
  assert.equal(parsed.type, 'error');
  assert.match(parsed.message, /invalid or expired/);
  assert.ok(!parsed.message.includes('internal-secret'));
});

test('partial credentials and ordinary navigation links never create a session', () => {
  for (const url of [null, 'smartmoneytracker://auth', 'smartmoneytracker://auth#access_token=only-access']) {
    assert.deepEqual(parseAuthCallback(url, destinations), { type: 'none' });
  }
});
