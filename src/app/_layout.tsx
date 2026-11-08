import { DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { FinanceProvider, useFinance } from '@/providers/finance-provider';
import { AppThemeProvider, useAppTheme, useThemeColors } from '@/theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { CalculatorFab } from '@/components/calculator-fab';
import type { ReactNode } from 'react';

export default function RootLayout() {
  return <AppThemeProvider><ThemedRootLayout /></AppThemeProvider>;
}

function ThemedRootLayout() {
  const colors = useThemeColors();
  const { ready } = useAppTheme();
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
  if (!ready) return <View style={{ backgroundColor: colors.background, flex: 1 }} />;
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <AuthProvider><RootNavigator /></AuthProvider>
    </NavigationThemeProvider>
  );
}

function RootNavigator() {
  const colors = useThemeColors();
  const { mode } = useAppTheme();
  const { session, loading, passwordRecovery } = useAuth();
  if (loading) return <Screen><AppText>Loading your secure session…</AppText></Screen>;
  const navigator = <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
      <Stack.Protected guard={Boolean(session) && !passwordRecovery}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="accounts" />
        <Stack.Screen name="transaction/[id]" />
        <Stack.Screen name="savings" />
        <Stack.Screen name="analytics" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="auth" />
      </Stack.Protected>
    </Stack>;
  return <><StatusBar style={mode === 'dark' ? 'light' : 'dark'} /><View style={{ backgroundColor: colors.background, flex: 1 }}>{session && !passwordRecovery ? <FinanceProvider><AuthenticatedApp>{navigator}</AuthenticatedApp></FinanceProvider> : navigator}{session && !passwordRecovery ? <CalculatorFab /> : null}</View></>;
}

function AuthenticatedApp({ children }: { children: ReactNode }) {
  const { dataLoading, dataError, reloadData } = useFinance();
  if (dataLoading && dataError) return <Screen><View style={{ gap: 16 }}><AppText color="expense">Could not sync your financial data: {dataError}</AppText><Button label="Try again" onPress={reloadData} /></View></Screen>;
  if (dataLoading) return <Screen><AppText>Loading your financial data…</AppText></Screen>;
  return children;
}
