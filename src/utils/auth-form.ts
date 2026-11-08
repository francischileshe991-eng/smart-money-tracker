export type AuthMode = 'login' | 'register' | 'recovery';
export type AuthFieldErrors = { name?: string; email?: string; password?: string };

export function validateAuthForm(mode: AuthMode, values: { name: string; email: string; password: string }): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (mode === 'register' && values.name.trim().length < 2) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (mode !== 'recovery' && !values.password) errors.password = 'Enter your password.';
  else if (mode === 'register' && values.password.length < 8) errors.password = 'Use at least 8 characters.';
  return errors;
}

export function authErrorFeedback(cause: unknown): { field?: 'email' | 'password'; message: string } {
  const error = cause && typeof cause === 'object' ? cause as { code?: string; name?: string; status?: number } : {};
  switch (error.code) {
    case 'invalid_credentials': return { message: 'Email or password is incorrect.' };
    case 'email_not_confirmed': return { message: 'Confirm your email address before signing in. Check your inbox for the confirmation link.' };
    case 'email_address_invalid': return { field: 'email', message: 'Enter a valid email address.' };
    case 'weak_password': return { field: 'password', message: 'Choose a stronger password. Avoid common passwords and use a mix of letters, numbers and symbols.' };
    case 'same_password': return { field: 'password', message: 'Choose a password different from your current one.' };
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': case 'over_email_send_daily_limit':
      return { message: 'Too many attempts. Wait a few minutes and try again.' };
    case 'user_already_exists': case 'email_exists': return { message: 'Try signing in with this email, or reset your password.' };
    case 'signup_disabled': return { message: 'New accounts are unavailable right now. Please try again later.' };
    case 'otp_expired': case 'session_not_found': case 'session_expired': return { message: 'This link or session has expired. Request a new link and try again.' };
  }
  if (error.name === 'AuthRetryableFetchError' || error.name === 'TypeError') {
    return { message: 'Could not connect. Check your internet connection and try again.' };
  }
  return { message: 'Could not complete your request. Please try again.' };
}

export function validatePasswordReset(password: string, confirmation: string): { password?: string; confirmation?: string } {
  return {
    ...(password.length < 8 ? { password: 'Use at least 8 characters.' } : {}),
    ...(password !== confirmation ? { confirmation: 'The passwords do not match.' } : {}),
  };
}
