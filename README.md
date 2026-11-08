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
- **Profile** — choose from 15 built-in profile icons using the avatar's Edit link.
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

  To use the SQL editor, apply every file in `supabase/migrations/` in filename
  order; later migrations add offline-sync revision tracking.

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

> Email confirmation is enabled in local configuration. Hosted Auth settings are
> managed separately: configure a verified SMTP sender and test email delivery
> before enabling production confirmation. See the deployment guide before
> pushing configuration, since the local web URL is still localhost.

## Commands

```bash
npx expo start            # start the dev server
npx expo start --web      # run in the browser
npm test                 # finance, pagination, and sync regression tests (Node 22.18+)
npx tsc --noEmit          # typecheck
npx expo lint             # lint
npx expo export           # verify the production bundle
```

## Notes

- Automated tests use Node's built-in test runner and native TypeScript support;
  run them with Node 22.18 or newer. They require no Supabase credentials or live
  database. Repository tests use the real Supabase client with simulated REST
  responses; they do not replace database RLS tests or device testing.

- Money is stored as integer ngwee. Balances, budgets, and totals never use
  floating-point arithmetic.
- Each user can only read and write their own rows. The database enforces this
  with row-level security.
- `.env` is gitignored. Every developer supplies their own Supabase credentials.
- Native `ios/` and `android/` folders are generated; do not edit them by hand.
- Finance data is cached on-device and remains editable offline. Pending changes
  sync when connectivity returns; revision checks surface cross-device conflicts
  before one snapshot can replace another.
- Cloud loading paginates all snapshot tables with stable ordering, including
  transaction and savings contribution histories. A failed page or revision
  change rejects the load rather than returning a partial snapshot.
- Password recovery uses `smartmoneytracker://reset-password` on native builds and
  `http://localhost:8081/reset-password` on web. A production build needs the
  deployed URL added to Supabase.

## Documentation

- [First Android deployment, step by step](docs/DEPLOYMENT.md)

- [Supabase setup and database tests](docs/SUPABASE.md)
- [Architecture and decisions](docs/ARCHITECTURE.md)

## License

MIT. See [LICENSE](LICENSE).
