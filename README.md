# Smart Money Tracker

A mobile-first personal finance app for tracking income, expenses, and budgets in
Zambian Kwacha (ZMW). Built with Expo and TypeScript.

## Phase status

**Phases 1–8 are implemented. Authentication and cloud sync run against a Supabase project configured through `.env`.**

- Five working destinations: Home, Transactions, Add, Budgets, Profile.
- Dashboard with total available balance, monthly income and expense summaries,
  working quick actions, budget overview, savings progress and recent transactions.
- Add, edit, and delete income, expenses, and transfers, with confirmation,
  validation, search, category/date/type filters, and date/amount sorting.
- Create, edit, archive, restore, and safely delete cash, bank, MTN Mobile Money,
  Airtel Money, and other accounts.
- Per-account calculated balances and transaction histories; transfers move funds
  between accounts without affecting income or expense totals.
- Budget limits with warning thresholds and spending history, plus savings goals
  with contributions, withdrawals, completion, and history.
- Analytics with month, 3-month, 6-month, and custom range comparisons.
- Forest-green visual identity with a reusable component library.
- Light-first responsive layouts for Android, iOS, and web.
- Email/password registration and login, persisted auth sessions, logout, and password recovery.
- Supabase-backed profiles, accounts, categories, transactions, budgets, savings goals, and contributions.
- PostgreSQL constraints, owner-scoped RLS, and a pgTAP cross-user isolation test.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for decisions and the roadmap.

## Stack

- Expo SDK 58 / React Native 0.88 / React 19
- TypeScript (strict)
- Expo Router with native tabs on mobile and headless tabs on web
- `expo-symbols` for platform-native icons
- Supabase Auth and PostgreSQL
- No state or UI framework dependencies beyond Expo

## Getting started

```bash
npm install
cp .env.example .env # add the Supabase project URL and publishable key
npx expo start
```

Open the project in Expo Go, an Android emulator, an iOS simulator, or the web
bundle. Native folders are generated with Continuous Native Generation; do not
edit `ios/` or `android/` by hand.

## Quality checks

```bash
npx tsc --noEmit
npx expo lint
npx eslint .
npx expo export   # verify the production bundle
```

## Project structure

```
src/
  app/                  Expo Router screens and root layout
    (tabs)/             Home, Transactions, Add, Budgets, Profile
    accounts/           Account list, detail/history, and create/edit screens
    transaction/[id].tsx  Edit or delete a transaction
    auth.tsx            Sign in / register
    reset-password.tsx  Password recovery
    savings.tsx         Savings goals
    analytics.tsx       Spending analytics
  components/
    ui/                 Reusable design-system primitives
    transactions/       Transaction form, list, and row
    budgets/            Budget row and shared budget overview
    savings/            Savings progress rows and summary card
    app-tabs*.tsx       Native and web tab bars
  data/                 Finance repository and category definitions
  navigation/           Shared tab configuration
  providers/            Auth and finance state boundaries
  theme/                Colours, typography, spacing, radii, shadows
  types/                Finance domain types
  utils/                Money, dates, finance, transaction query/validation
docs/
  ARCHITECTURE.md
  SUPABASE.md
```

## Money rules

Amounts are stored as integer minor units (ngwee). Financial totals use integer
arithmetic only; user input is parsed with string/integer operations rather than
floating-point conversion. Formatting never turns money into a float.

## Current limitations

Create and link a Supabase project, apply `supabase/migrations`, and configure the
email redirect URLs before the app can register users or sync cloud data. See
[docs/SUPABASE.md](docs/SUPABASE.md). The database isolation test requires a local
Supabase stack. Snapshot persistence is transactional but concurrent edits from
multiple devices are last-write-wins.
