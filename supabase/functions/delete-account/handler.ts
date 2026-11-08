import type { SupabaseClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const json = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

/** Fresh clients per request: never reuse an authenticated user across requests. */
export function createDeletionHandler(clients: () => { user: SupabaseClient; admin: SupabaseClient }) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: 'Sign in before deleting your account.' }, 401);
    let body: { password?: unknown; confirmation?: unknown; userId?: unknown; user_id?: unknown };
    try {
      const text = await request.text();
      if (text.length > 16384) return json({ error: 'Request too large.' }, 413);
      body = JSON.parse(text);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    } catch { return json({ error: 'Enter your password and confirm deletion.' }, 400); }
    if (body.userId !== undefined || body.user_id !== undefined) return json({ error: 'Only your own account can be deleted.' }, 400);
    if (body.confirmation !== 'DELETE' || typeof body.password !== 'string' || !body.password || body.password.length > 4096) {
      return json({ error: 'Enter your current password and type DELETE to confirm.' }, 400);
    }
    try {
      const { user, admin } = clients();
      const { data: identity, error: identityError } = await user.auth.getUser(token);
      if (identityError || !identity.user?.email) return json({ error: 'Your session has expired. Sign in again.' }, 401);
      const owner = identity.user;
      const { data: verified, error: passwordError } = await user.auth.signInWithPassword({ email: owner.email!, password: body.password });
      if (passwordError || verified.user?.id !== owner.id) {
        if (verified.user) await user.auth.signOut({ scope: 'local' }).catch(() => {});
        if (passwordError?.status === 429) return json({ error: 'Too many attempts. Wait a few minutes and try again.' }, 429);
        return json({ error: 'Your password is incorrect.' }, 403);
      }
      try {
        // Remove legacy avatar objects through Storage, never by deleting object rows in SQL.
        const bucket = admin.storage.from('avatars');
        async function removeFolder(prefix: string, depth = 0): Promise<void> {
          if (depth > 8) throw new Error('Unexpected storage nesting');
          for (let page = 0; page < 1000; page += 1) {
            const { data, error } = await bucket.list(prefix, { limit: 100, offset: 0 });
            if (error) {
              if (String(error.statusCode) === '404' || /bucket not found/i.test(error.message)) return;
              throw error;
            }
            if (!data?.length) return;
            const files: string[] = [];
            for (const entry of data) {
              if (!entry.name || entry.name.includes('/') || entry.name === '.' || entry.name === '..') throw new Error('Invalid object path');
              const path = `${prefix}/${entry.name}`;
              if (entry.id) files.push(path);
              else await removeFolder(path, depth + 1);
            }
            if (files.length) {
              const { error: removeError } = await bucket.remove(files);
              if (removeError) throw removeError;
            }
          }
          throw new Error('Too many stored files');
        }
        await removeFolder(owner.id);
        // Existing user_id foreign keys cascade all finance/profile records and sessions.
        const { error: deletionError } = await admin.auth.admin.deleteUser(owner.id, false);
        if (deletionError) throw deletionError;
        return json({ deleted: true });
      } finally {
        // Revoke the temporary password-verification session even if deletion fails.
        await user.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    } catch {
      // Never log or return credentials, tokens, or internal infrastructure errors.
      return json({ error: 'Could not delete your account. Please try again.' }, 500);
    }
  };
}
