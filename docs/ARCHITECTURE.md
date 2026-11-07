# Architecture — Smart Money Tracker

## Status

Phase 8 (Supabase backend and authentication) is implemented in the repository;
connecting a Supabase project and running the database isolation suite remain setup steps.

- Five-tab navigation: Home, Transactions, Add, Budgets, Profile.
- Light-first design system with reusable components.
- Dashboard with total available balance, monthly income/expense summaries,
  quick actions, budget overview, savings progress and recent transactions.
- Full transaction management: income, expenses, and inter-account transfers with
  add, edit, delete, confirmation, search, type/category/date filters, and sorting.
- Budget creation/editing with warning thresholds and spending history.
- Savings goals with contributions, withdrawals, completion, and history.
- Analytics screen with month, 3-month, 6-month, and custom date ranges.
- Supabase Auth with persisted mobile sessions and guarded app routes.
- User-owned PostgreSQL finance records with RLS, relational ownership constraints,
  and transactionally saved finance snapshots.
- Multi-account management for cash, bank, MTN Mobile Money, Airtel Money, and
  other accounts, including account history, archive/restore, and transfers.
- Branding: application name, forest-green palette, app icon and splash screen.

The app requires a configured Supabase project. See `docs/SUPABASE.md` for setup,
redirect allow-list, migration, and test instructions.

## Technology

| Concern | Choice |
| --- | --- |
| Runtime | Expo SDK 58, React Native 0.88, React 19 |
| Language | TypeScript, strict mode |
| Navigation | Expo Router file-based routes |
| Native navigation | `expo-router/native-tabs` |
| Web navigation | `expo-router/ui` headless tabs in `app-tabs.web.tsx` |
| Icons | `expo-symbols` (SF Symbols on iOS, Material Symbols on Android/web) |
| Styling | React Native `StyleSheet` + design tokens |

## Key decisions

### 1. Tokens instead of ad-hoc styles

All colours, spacing, radii, typography variants, shadows, and layout limits live
in `src/theme/tokens.ts`. Screens and components consume tokens through:

- `AppText` for typography variants and semantic colours.
- `Card`, `Button`, `Chip`, `TextField`, `Modal`, `ProgressBar`, and other UI
  primitives.
- Shared semantic icon names from `src/components/ui/icon.tsx`.

This keeps the interface consistent and makes future theme changes a token change
rather than a screen-by-screen rewrite.

### 2. Light-first interface

The app is designed for a light interface (`userInterfaceStyle: "light"` in
`app.json`). The palette uses white surfaces on a light grey background with deep
forest green as the primary brand colour. Income is green and expenses are red.

Dark mode was not required in Phase 1. If it is added later, tokens are already
centralised, but semantic colour names should be audited for contrast.

### 3. Navigation

A root stack guards the authenticated app and hosts both the tab group and the
detail screens:

```
src/app/
  _layout.tsx              Auth guard, theme, and root stack
  auth.tsx                 Sign in / register
  reset-password.tsx       Password recovery
  (tabs)/
    _layout.tsx            Native/web tab navigator
    index.tsx              Home
    transactions.tsx       Searchable, filterable transaction history
    add.tsx                Add transaction
    budgets.tsx            Budget management
    profile.tsx            Account profile and data controls
  accounts/                Account list, detail/history, and account form
  transaction/[id].tsx     Edit or delete a transaction
  savings.tsx              Savings goal management
  analytics.tsx            Spending analytics
```

`src/navigation/tabs.ts` is the single source of truth for tab names, routes,
labels, and icons. Native and web tab bars both read from it, so the destinations
cannot drift apart.

The Add screen reads an optional `type` query parameter (`income`, `expense`, or
`transfer`) so the Home quick actions can open the form with the correct type
preselected. Transaction rows on the dashboard and history screen navigate to
`transaction/[id]`.

### 4. Transaction management

`TransactionForm` (`src/components/transactions/transaction-form.tsx`) is shared
by the add screen and the edit route.

- The form supports income, expense, and transfer transactions with amount,
  description, category, date, account, and optional notes.
- Transfer source and destination accounts must differ, and transfers never count
  as income or expenses.
- Pure validation lives in `src/utils/transaction-validation.ts`
  (`validateTransactionInput`), so the form and Node checks reject incomplete or
  invalid records with identical rules.
- `addTransaction` and `updateTransaction` return `false` for invalid account
  references; the form surfaces that as a submission error.
- Editing or deleting a transaction recalculates account balances and budget
  spending immediately because all totals are derived from the ledger.
- Archived accounts remain selectable when editing a transaction that already
  references them, but they are not offered for new transactions.
- Search, type/category/date filtering, and date/amount sorting live in
  `src/utils/transaction-query.ts` and power the history screen.

### 5. Money handling

**Money is never stored or calculated as a floating-point number.**

- Every amount is an integer number of minor units (ngwee): `amountMinor`.
- Totals, balances, and budget spending are integer sums computed by the pure
  helpers in `src/utils/finance.ts` and memoised in `FinanceProvider`.
- User input is parsed with integer string operations in
  `src/utils/currency.ts`; `parseFloat` is not used.
- Display formatting splits the integer into whole units and two decimal digits.
  It does not perform monetary division for authoritative values.
- Percentages are display-only visuals and are clamped to 0–100.

The PostgreSQL schema stores amounts as `bigint` minor units, preserving the same
exactness across cloud persistence.

### 6. Data boundary

`FinanceProvider` loads the authenticated user's accounts, transactions, budgets,
and savings goals from Supabase and derives totals locally. It saves changes through
one database RPC transaction, while Supabase RLS and same-owner foreign keys enforce
the data boundary. New accounts start with no sample financial data.

Profile rows and default categories are created when an auth user registers. Auth
sessions are persisted using the Expo-compatible React Native storage adapter.

The Profile screen can clear the authenticated user's cloud finance records. This
action is confirmed and cannot be undone.

### 7. Dashboard composition

The home screen is composed from provider-derived aggregates:

- `monthlyIncomeMinor` / `monthlyExpenseMinor` filter transactions by their ISO
  date prefix for the current calendar month (`currentMonthPrefix`), so adding a
  transaction updates the dashboard immediately.
- Each account balance is its opening balance plus income, minus expenses, plus
  incoming transfers, and minus outgoing transfers.
- The available balance is the sum of active account balances. Archived accounts
  retain their balance and history but are excluded from this total and new
  transaction choices.
- Accounts referenced by transactions cannot be deleted; archiving preserves their
  financial history.
- `BudgetOverviewCard` is shared by the dashboard and the budgets screen, so both
  report identical totals.
- Savings goals and contribution history are stored per user in PostgreSQL and
  loaded through the finance repository.
- The monthly net shown in the balance card is a display-only subtraction of the
  two integer monthly totals.

All dashboard amounts are integers in ngwee and are formatted only at render time.

### 8. Responsive layout

- Screens use `SafeAreaView` and a shared `Screen` wrapper.
- Content is capped at 720 dp and centred, which keeps forms readable on tablets.
- Quick actions use `flexWrap` with a minimum width, so three columns collapse
  gracefully on narrow Android devices (for example 320 dp wide).
- Long lists use `FlatList`; dashboard content uses `ScrollView`.
- Text uses `numberOfLines` and flexible containers to prevent horizontal
  overflow. No fixed screen-width assumptions are used.
- The web tab bar uses a fixed bottom bar; the shared Screen wrapper reserves
  space for it.

### 9. Accessibility

Interactive components use `accessibilityRole`, `accessibilityLabel`, and selected
or disabled state where relevant. Icons are paired with text labels. Transaction
rows expose a combined accessibility label rather than raw visual fragments.

## Component library

| Component | Purpose |
| --- | --- |
| `AppText` | Typography scale and semantic text colours |
| `Button` | Primary, secondary, ghost, and danger actions |
| `Chip` | Filters and selectable options |
| `Card` | Surface, primary, and muted containers |
| `TextField` | Labelled input with focus, hint, error, and unit states |
| `Modal` | Accessible confirmation / result dialog |
| `ProgressBar` | Budget progress visual |
| `Screen` | Safe-area, max-width scrolling screen shell |
| `ScreenHeader` | Screen title and supporting text |
| `SectionHeader` | Section title with an optional working action |
| `EmptyState` | Consistent empty or no-results state |
| `StatCard` | Income / expense summary tile |
| `DateField` | Dependency-free Monday-start calendar picker |
| `BackLink` | Consistent back navigation affordance |
| `TransactionForm` | Shared add/edit form for income, expenses, and transfers |
| `TransactionItem` / `TransactionList` | Shared transaction presentation |
| `BudgetRow` | Budget category progress row |
| `BudgetOverviewCard` | Shared total budget usage (dashboard and budgets) |
| `SavingsGoalProgress` | Per-goal savings progress row |
| `SavingsSummaryCard` | Total savings progress and goal rows |

## Validation performed

- `npx tsc --noEmit`
- `npx eslint .` / `npx expo lint`
- Production bundle exports with `npx expo export --platform android` and
  `--platform web`
- Server-rendered web export returns HTTP 200 for the tab, account, transaction,
  savings, analytics, auth, and password-recovery routes. Without a configured
  Supabase project the protected routes render the auth guard.
- Node checks using native TypeScript support cover:
  - integer money parsing/formatting and date helpers;
  - account balances, transfer accounting, budget spending, and add/edit/delete
    recalculation;
  - transaction search, filtering, and sorting;
  - transaction validation rejection rules (missing amount/description/date,
    unknown accounts, identical transfer accounts, and mismatched categories).
- Live two-user RLS isolation check against the hosted Supabase project:
  reads, inserts, updates, and deletes were denied across profiles, accounts,
  transactions, budgets, savings goals, and goal contributions; the snapshot RPC
  only touched the caller's data. Temporary test users were removed afterward.

## Deferred work

- Running the pgTAP database suite locally (Docker is not available in this
  environment); the equivalent live two-user isolation check has passed.
- Multi-device conflict resolution: snapshot persistence is transactional, but
  concurrent edits are last-write-wins.
- Dark mode and additional accessibility audits on physical devices.
- Recurring transactions, reminders, and data import/export.
