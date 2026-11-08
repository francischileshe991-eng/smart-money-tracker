import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authErrorFeedback, validateAuthForm, validatePasswordReset } from '../src/utils/auth-form.ts';

const values = { name: 'Francis', email: 'francis@example.com', password: 'a-long-password' };

test('login validates email and required password without enforcing new-account rules', () => {
  assert.deepEqual(validateAuthForm('login', { ...values, name: '', password: 'old' }), {});
  assert.deepEqual(validateAuthForm('login', { ...values, email: ' francis@example.com ' }), {});
  const errors = validateAuthForm('login', { ...values, email: 'bad@', password: '' });
  assert.equal(errors.email, 'Enter a valid email address.');
  assert.equal(errors.password, 'Enter your password.');
  assert.equal(errors.name, undefined);
});

test('invalid email addresses produce field errors before contacting the server', () => {
  for (const email of ['', 'missing-at.example.com', 'a@@example.com', 'a b@example.com', 'a@example com']) {
    assert.ok(validateAuthForm('login', { ...values, email }).email, email);
  }
});

test('registration checks the trimmed name and minimum password length', () => {
  const errors = validateAuthForm('register', { ...values, name: ' ', password: 'short' });
  assert.ok(errors.name);
  assert.ok(errors.password);
  assert.deepEqual(validateAuthForm('register', values), {});
});

test('recovery only requires a valid email, ignoring passwords and names', () => {
  assert.deepEqual(validateAuthForm('recovery', { ...values, name: '', password: '' }), {});
  assert.ok(validateAuthForm('recovery', { ...values, email: 'bad' }).email);
});

test('password reset reports separate length and mismatch errors', () => {
  assert.deepEqual(validatePasswordReset('long-password', 'long-password'), {});
  assert.ok(validatePasswordReset('short', 'short').password);
  assert.ok(validatePasswordReset('long-password', 'different').confirmation);
  assert.equal(validatePasswordReset('long-password', 'different').password, undefined);
  assert.ok(validatePasswordReset(' password ', 'password').confirmation);
});

test('incorrect credentials do not identify which credential failed', () => {
  assert.deepEqual(authErrorFeedback({ code: 'invalid_credentials' }), {
    message: 'Email or password is incorrect.',
  });
});

test('server field errors are attached to the matching input only', () => {
  assert.equal(authErrorFeedback({ code: 'weak_password' }).field, 'password');
  assert.equal(authErrorFeedback({ code: 'same_password' }).field, 'password');
  assert.equal(authErrorFeedback({ code: 'email_address_invalid' }).field, 'email');
  assert.equal(authErrorFeedback({ code: 'validation_failed' }).field, undefined);
});

test('rate limits, offline failures and unconfirmed email have actionable feedback', () => {
  assert.match(authErrorFeedback({ code: 'over_request_rate_limit' }).message, /Wait a few minutes/);
  assert.match(authErrorFeedback({ code: 'over_email_send_rate_limit' }).message, /Wait a few minutes/);
  assert.match(authErrorFeedback({ name: 'AuthRetryableFetchError' }).message, /internet connection/);
  assert.match(authErrorFeedback({ code: 'email_not_confirmed' }).message, /Confirm your email/);
  assert.match(authErrorFeedback({ code: 'otp_expired' }).message, /Request a new link/);
});

test('unexpected errors never expose raw infrastructure messages', () => {
  for (const cause of [new Error('internal database details'), null, 'unexpected']) {
    assert.deepEqual(authErrorFeedback(cause), { message: 'Could not complete your request. Please try again.' });
  }
});
