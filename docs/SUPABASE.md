# Supabase setup

## Connect a project

1. Create a Supabase project and copy its Project URL and publishable key (the `sb_publishable_...` key, or the legacy anon key).
2. Copy `.env.example` to `.env` and fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These values are public client configuration. Never put a service-role or secret key in an `EXPO_PUBLIC_` variable or the mobile app.
3. Install the Supabase CLI, authenticate it, link the project, and run `supabase db push` from the project root. The initial migration creates all seven requested tables, signup triggers, constraints, indexes, and owner-only RLS policies.
4. Add `smartmoneytracker://auth`, `smartmoneytracker://reset-password`, `http://localhost:8081/auth`, and `http://localhost:8081/reset-password` to the Supabase Auth redirect allow list. The app builds these with `Linking.createURL`, so the same code works on native and web.
5. Restart Expo after setting environment variables. Registration, login, logout, password recovery, and persisted mobile sessions are available from the auth screen and Profile.

> Local testing only: `supabase/config.toml` currently sets `enable_confirmations = false` so signup returns a session immediately in Expo Go. Re-enable email confirmations (`enable_confirmations = true`) and run `supabase config push` before shipping to production.

The app uses a database RPC to save each signed-in user's finance snapshot in one transaction. The RPC runs as the caller, takes its owner from `auth.uid()`, and relies on RLS and composite foreign keys. The database never trusts a client-supplied owner ID. It validates amounts, enums, dates, text lengths, and same-user relationships.

## Database tests

The pgTAP isolation test lives at `supabase/tests/rls_isolation_test.sql`. Run it against a local Supabase database with `supabase start` and `supabase test db`. It creates two auth users, authenticates as each, and checks read, insert, update, and delete isolation.

The hosted project has also been checked with an equivalent temporary two-user REST isolation run covering profiles, accounts, transactions, budgets, savings goals, and contributions. The temporary users were deleted afterward.

## Current limits

- A Supabase project and its credentials are required before registration and cloud persistence can work. Each developer supplies their own `.env`; the repository contains no project URL or keys.
- The finance provider writes full snapshots through a single transaction. This is safe from partial writes and owner spoofing, but simultaneous edits from multiple devices can overwrite one another; row-level conflict resolution is future work.
- Password recovery uses `Linking.createURL('/reset-password')`: `smartmoneytracker://reset-password` on native builds and `http://localhost:8081/reset-password` on web. Verify the email link on both targets before release.
- The app does not upload the former local sample dataset. New users start with empty accounts and create their own records.
