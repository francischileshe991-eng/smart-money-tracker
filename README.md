# Smart Money Tracker

A mobile-first personal finance app for tracking income, expenses, budgets, and
savings in Zambian Kwacha (ZMW). Built with Expo, React Native, TypeScript, and
Supabase.

## Features

- **Dashboard** — available balance, monthly income and expenses, budget progress,
  savings progress, and recent activity.
- **Transactions** — add, edit, and delete income, expenses, and account transfers.
  Search, filter, and sort by category, type, date, or amount.
- **Accounts** — cash, bank, MTN Mobile Money, Airtel Money, and other accounts with
  calculated balances, per-account history, and safe archive/delete.
- **Budgets** — monthly or custom-date limits with warning thresholds and spending
  history.
- **Savings goals** — targets, contributions, withdrawals, completion, and history.
- **Analytics** — income vs. expense comparisons over 1, 3, 6 months, or a custom range.
- **Authentication and sync** — email/password auth, persistent sessions, password recovery,
  and Supabase-backed cloud data protected by owner-only row-level security.

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- Expo Go, an Android emulator, or an iOS simulator

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and add your Supabase values:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   Use the **publishable** key (or legacy anon key). Never put a service-role or
   secret key in an `EXPO_PUBLIC_` variable.

3. Apply the database schema:

   ```bash
   npx supabase login
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

   You can also paste `supabase/migrations/20261107000000_initial_schema.sql`
   into the Supabase SQL editor.

4. In Supabase, add these Auth redirect URLs:

   ```text
   smartmoneytracker://auth
   smartmoneytracker://reset-password
   http://localhost:8081/auth
   http://localhost:8081/reset-password
   ```

5. Start the app:

   ```bash
   npx expo start
   ```

   Then open it in Expo Go, an emulator, or the web bundle. If you change `.env`,
   restart with `npx expo start --clear`.

> Email confirmation is disabled in `supabase/config.toml` so signup works
> immediately during local testing. Re-enable it and run `npx supabase config push`
> before production.

## Commands

```bash
npx expo start            # start the dev server
npx expo start --web      # run in the browser
npx tsc --noEmit          # typecheck
npx expo lint             # lint
npx expo export           # verify the production bundle
```

## Notes

- Money is stored as integer ngwee. Balances, budgets, and totals never use
  floating-point arithmetic.
- Each user can only read and write their own rows. The database enforces this
  with row-level security.
- `.env` is gitignored. Every developer supplies their own Supabase credentials.
- Native `ios/` and `android/` folders are generated; do not edit them by hand.
- Cloud saves are transactional, but simultaneous edits from multiple devices are
  last-write-wins.
- Password recovery uses `smartmoneytracker://reset-password` on native builds and
  `http://localhost:8081/reset-password` on web. A production build needs the
  deployed URL added to Supabase.

## Documentation

- [Supabase setup and database tests](docs/SUPABASE.md)
- [Architecture and decisions](docs/ARCHITECTURE.md)

## License

MIT. See [LICENSE](LICENSE).
