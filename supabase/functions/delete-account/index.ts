import { createClient } from '@supabase/supabase-js';
import { createDeletionHandler } from './handler.ts';

// This entry point runs in Supabase's Deno runtime; the handler is also checked by TypeScript locally.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

Deno.serve(createDeletionHandler(() => {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) throw new Error('Server configuration is missing');
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  return { user: createClient(url, anonKey, options), admin: createClient(url, serviceKey, options) };
}));
