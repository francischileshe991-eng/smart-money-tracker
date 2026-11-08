export type AuthCallback =
  | { type: 'none' }
  | { type: 'error'; message: string }
  | { type: 'code'; code: string; recovery: boolean }
  | { type: 'tokens'; accessToken: string; refreshToken: string; recovery: boolean };

/** Read credentials only from this app's configured callback destinations. */
export function parseAuthCallback(value: string | null, allowedRedirects: string[]): AuthCallback {
  if (!value) return { type: 'none' };
  let url: URL;
  try { url = new URL(value); } catch { return { type: 'none' }; }
  const allowed = allowedRedirects.some((destination) => {
    const expected = new URL(destination);
    return url.protocol === expected.protocol && url.host === expected.host && url.pathname === expected.pathname;
  });
  if (!allowed) return { type: 'none' };
  const fragment = new URLSearchParams(url.hash.slice(1));
  const parameter = (name: string) => url.searchParams.get(name) ?? fragment.get(name);
  if (parameter('error') || parameter('error_code')) {
    return { type: 'error', message: 'This sign-in link is invalid or expired. Request a new link and try again.' };
  }
  const recovery = parameter('type') === 'recovery' || url.pathname.endsWith('/reset-password') || url.host === 'reset-password';
  const code = parameter('code');
  if (code) return { type: 'code', code, recovery };
  const accessToken = parameter('access_token');
  const refreshToken = parameter('refresh_token');
  if (accessToken && refreshToken) return { type: 'tokens', accessToken, refreshToken, recovery };
  return { type: 'none' };
}

/** Remove one-time credentials from browser history after a successful exchange. */
export function scrubAuthCallbackUrl(value: string): string {
  const url = new URL(value);
  const keys = ['code', 'access_token', 'refresh_token', 'token_type', 'expires_in', 'expires_at', 'type'];
  for (const key of keys) url.searchParams.delete(key);
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (keys.some((key) => fragment.has(key))) {
    for (const key of keys) fragment.delete(key);
    url.hash = fragment.toString();
  }
  return url.toString();
}
