# First deployment: Android test APK

The first milestone is a private APK installed on your Android phone. A website,
Google Play account, and Apple Developer membership are not needed for that test.
A public store release is a later milestone.

## 1. Create an Expo account and sign in

Create an account at https://expo.dev/signup. In a terminal in this project, run:

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami
```

Enter credentials in the terminal, never in chat or a committed file.
The CLI must be signed in before this project can be linked or a cloud build started.

## 2. Link the app to your Expo account

```bash
npx eas-cli@latest init
```

Create a new Expo project when prompted. This writes its real project ID into app
configuration. No placeholder project ID is included in this repository.

The initial application identifier is `com.smartmoneytracker.app` on Android and
iOS. Before the first public store release, confirm this is the permanent
identifier you want. A store listing cannot later be moved to a different identifier.

## 3. Configure the preview environment

Copy only the two public Supabase values from your local `.env` into your Expo
project's **Environment variables**, with environment **preview**:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never upload a service-role/secret key as an `EXPO_PUBLIC_` variable.
The preview profile in `eas.json` selects this environment. Gitignored `.env`
files are not a substitute for these cloud environment settings.

## 4. Enable account deletion in Supabase

Review `supabase/functions/delete-account/`. The function validates the caller's
bearer token with Supabase Auth, verifies their current password, removes any
legacy avatar files in their folder, and hard-deletes only that authenticated
user. Existing foreign keys cascade their financial records. No admin key is
included in the app; the function uses Supabase's server-provided environment.

```bash
npx supabase functions deploy delete-account --use-api
```

The configuration disables gateway-only JWT verification because the function
performs its own `getUser(token)` validation and supports current signing keys.
This is not an unauthenticated deletion endpoint. If the CLI asks for hosted
mutation consent, explicitly review and confirm that single function deployment.
Do not delete a real account as a deployment test.

After successful deletion, the app drains pending device writes, removes that
user's cached finance snapshot and remembered account, and signs out locally.
Backups and copies cached on other devices are not instantly erased by deleting
this device's local cache.

## 5. Check authentication redirects

In Supabase's Authentication URL configuration, allow:

```text
smartmoneytracker://auth
smartmoneytracker://reset-password
smartmoneytracker:///auth
smartmoneytracker:///reset-password
```

The app uses PKCE for new email links and can consume older implicit-flow links.
A PKCE link should be opened on the same device/browser that requested it. Test
password recovery while signed out and while already signed in. Recovery sessions
are restricted to the reset screen until the password is changed or the user signs out.

`supabase/config.toml` now enables email confirmation as the release default, but
changing that local file does not change hosted Auth settings. Before enabling it
in production, configure custom SMTP with a verified sender in the Supabase
dashboard and test delivery to a non-team email address. The built-in email
service is for testing and has recipient/rate limits. Avoid pushing the entire
local config blindly: its web site URL is still localhost.

## 6. Build and install the APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

Let Expo generate an Android keystore when prompted for the first build. Keep
ownership of the Expo account and signing credentials. The CLI prints the build
page. When complete, download its APK on your phone and allow installation from
that browser if Android asks. This installs the app privately, not in Google Play.

## 7. Test on your phone

Use disposable test accounts and record results before public release:

- Register, confirm email, sign in, sign out, and restart the app.
- Request a reset email and open the link in the installed app; expired links show an error.
- Save income/expenses/transfers; verify balances and budgets.
- Edit offline, restart offline, reconnect, and confirm synchronization.
- Use two devices to trigger a conflict and verify each resolution option.
- Switch users and confirm their financial records stay separate.
- Check light/dark mode, large text, the keyboard, and password autofill.
- Delete a disposable account with its password and DELETE confirmation; verify
  it cannot sign in again and its cloud rows are gone. An incorrect password
  must leave the account intact.

## 8. Prepare a public release later

Once the APK works, choose a public publisher name, support email, and website or
hosted policy page. Publish a privacy policy and a web account-deletion request
path, and link them in-app. Complete Play Console Data safety declarations and
store metadata/screenshots, configure production Supabase environment variables,
and verify email delivery and production redirects. A Google Play developer
account is needed to publish on Google Play. iOS publication also needs an Apple
Developer account and device/TestFlight testing.

The production build profile creates an Android App Bundle, not the test APK:

```bash
npx eas-cli@latest build --platform android --profile production
```

Only submit after the release checks and policy/contact setup are complete.
