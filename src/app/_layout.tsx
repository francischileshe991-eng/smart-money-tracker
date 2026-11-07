import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FinanceProvider, useFinance } from '@/providers/finance-provider';
import { colors } from '@/theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { View } from 'react-native';
import type { ReactNode } from 'react';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.expense,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider><RootNavigator /></AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return <Screen><AppText>Loading your secure session…</AppText></Screen>;
  const navigator = <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="accounts" />
        <Stack.Screen name="transaction/[id]" />
        <Stack.Screen name="savings" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="auth" />
      </Stack.Protected>
    </Stack>;
  return <><StatusBar style="dark" />{session ? <FinanceProvider><AuthenticatedApp>{navigator}</AuthenticatedApp></FinanceProvider> : navigator}</>;
}

function AuthenticatedApp({ children }: { children: ReactNode }) {
  const { dataLoading, dataError, reloadData } = useFinance();
  if (dataLoading && dataError) return <Screen><View style={{ gap: 16 }}><AppText color="expense">Could not sync your financial data: {dataError}</AppText><Button label="Try again" onPress={reloadData} /></View></Screen>;
  if (dataLoading) return <Screen><AppText>Loading your financial data…</AppText></Screen>;
  return children;
}
