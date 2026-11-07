import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { useFinance } from '@/providers/finance-provider';
import { colors, spacing } from '@/theme';
import type { Transaction } from '@/types/finance';
import { formatMoney } from '@/utils/currency';
import { todayIso } from '@/utils/date';

type Range = 'month' | '3months' | '6months' | 'custom';
type MonthSummary = { key: string; label: string; income: number; expense: number };

function monthStart(date: string): string { return `${date.slice(0, 7)}-01`; }
function shiftMonth(date: string, amount: number): string {
  const value = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  value.setMonth(value.getMonth() + amount);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-01`;
}
function dayBefore(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function inRange(transaction: Transaction, from: string, to: string): boolean {
  return transaction.date >= from && transaction.date <= to;
}
function sumType(transactions: Transaction[], type: 'income' | 'expense'): number {
  return transactions.reduce((total, txn) => total + (txn.type === type ? txn.amountMinor : 0), 0);
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return <View style={styles.track}><View style={[styles.bar, { backgroundColor: color, width: `${max > 0 ? Math.max(value > 0 ? 2 : 0, Math.min(100, (value / max) * 100)) : 0}%` }]} /></View>;
}

export default function AnalyticsScreen() {
  const { transactions, budgets, savingsGoals } = useFinance();
  const today = todayIso();
  const [range, setRange] = useState<Range>('month');
  const [customFrom, setCustomFrom] = useState(monthStart(today));
  const [customTo, setCustomTo] = useState(today);

  const { from, to } = useMemo(() => {
    if (range === 'custom') return { from: customFrom, to: customTo };
    const count = range === 'month' ? 1 : range === '3months' ? 3 : 6;
    return { from: shiftMonth(today, -(count - 1)), to: today };
  }, [customFrom, customTo, range, today]);

  const filtered = useMemo(() => transactions.filter((txn) => inRange(txn, from, to)), [from, to, transactions]);
  const expenses = useMemo(() => filtered.filter((txn) => txn.type === 'expense'), [filtered]);
  const incomeTotal = useMemo(() => sumType(filtered, 'income'), [filtered]);
  const expenseTotal = useMemo(() => sumType(filtered, 'expense'), [filtered]);
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of expenses) totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amountMinor);
    return [...totals.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const months = useMemo<MonthSummary[]>(() => {
    const rows: MonthSummary[] = [];
    let current = monthStart(from);
    const last = monthStart(to);
    while (current <= last && rows.length < 36) {
      const prefix = current.slice(0, 7);
      const records = filtered.filter((txn) => txn.date.startsWith(prefix));
      rows.push({ key: prefix, label: new Date(`${current}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' }), income: sumType(records, 'income'), expense: sumType(records, 'expense') });
      current = shiftMonth(current, 1);
    }
    return rows;
  }, [filtered, from, to]);
  const previousRange = useMemo(() => {
    const days = Math.max(1, Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000) + 1);
    const previousTo = dayBefore(from);
    return { from: addDays(previousTo, -(days - 1)), to: previousTo };
  }, [from, to]);
  const previousExpenseTotal = useMemo(() => sumType(transactions.filter((txn) => inRange(txn, previousRange.from, previousRange.to)), 'expense'), [previousRange, transactions]);
  const spendingChange = previousExpenseTotal === 0 ? null : Math.round(((expenseTotal - previousExpenseTotal) * 100) / previousExpenseTotal);
  const budgetSpent = budgets.reduce((sum, budget) => sum + budget.spentMinor, 0);
  const budgetLimit = budgets.reduce((sum, budget) => sum + budget.limitMinor, 0);
  const budgetUsage = budgetLimit > 0 ? Math.round((budgetSpent / budgetLimit) * 100) : 0;
  const savingsTotal = savingsGoals.reduce((sum, goal) => sum + goal.contributedMinor, 0);
  const savingsTarget = savingsGoals.reduce((sum, goal) => sum + goal.targetMinor, 0);
  const maxMonth = Math.max(1, ...months.flatMap((month) => [month.income, month.expense]));
  const maxCategory = categoryTotals[0]?.total ?? 0;
  const hasFinancialData = filtered.some((txn) => txn.type === 'income' || txn.type === 'expense');

  return (
    <Screen>
      <BackLink />
      <ScreenHeader subtitle="Understand your income, spending, and savings" title="Analytics" />
      <View style={styles.chips}>
        {([['month', 'This month'], ['3months', '3 months'], ['6months', '6 months'], ['custom', 'Custom']] as const).map(([value, label]) => <Chip key={value} label={label} active={range === value} onPress={() => setRange(value)} />)}
      </View>
      {range === 'custom' ? <Card style={styles.dateCard}><DateField label="From" value={customFrom} onChange={setCustomFrom} /><DateField label="To" value={customTo} onChange={setCustomTo} />{customFrom > customTo ? <AppText variant="caption" color="expense">Start date must be on or before end date.</AppText> : null}</Card> : null}
      {!hasFinancialData || from > to ? <EmptyState icon="transactions" title="No financial activity" message={from > to ? 'Choose a date range where the start comes before the end.' : 'Income and expense transactions in this period will appear in your reports.'} /> : <>
        <View style={styles.summary}><Card style={styles.summaryCard}><AppText variant="caption" color="textMuted">Income</AppText><AppText variant="amountSmall" style={styles.income}>{formatMoney(incomeTotal)}</AppText></Card><Card style={styles.summaryCard}><AppText variant="caption" color="textMuted">Expenses</AppText><AppText variant="amountSmall" style={styles.expense}>{formatMoney(expenseTotal)}</AppText></Card></View>
        <Card style={styles.insightCard}><AppText variant="h3">Period insights</AppText><AppText variant="body">{categoryTotals[0] ? `Highest spending category: ${categoryTotals[0].category} (${formatMoney(categoryTotals[0].total)}).` : 'No expenses recorded in this period.'}</AppText><AppText variant="body" color="textSecondary">{spendingChange === null ? 'No previous-period spending to compare.' : `Spending ${Math.abs(spendingChange)}% ${spendingChange > 0 ? 'higher' : spendingChange < 0 ? 'lower' : 'unchanged'} than the previous period.`}</AppText><AppText variant="body" color="textSecondary">{budgets.length ? `Current month budgets: ${budgetUsage}% utilised (${formatMoney(budgetSpent)} of ${formatMoney(budgetLimit)}).` : 'Set category budgets to see budget utilisation insights.'}</AppText><AppText variant="body" color="textSecondary">{savingsTarget > 0 ? `Savings progress: ${Math.min(100, Math.round((savingsTotal / savingsTarget) * 100))}% (${formatMoney(savingsTotal)} of ${formatMoney(savingsTarget)}).` : 'Create a savings goal to track savings progress.'}</AppText></Card>
        <SectionHeader title="Income vs expenses" /><Card style={styles.chartCard}><View style={styles.legend}><AppText variant="captionStrong" style={styles.income}>Income</AppText><AppText variant="captionStrong" style={styles.expense}>Expenses</AppText></View>{months.map((month) => <View key={month.key} style={styles.monthRow}><AppText variant="caption" color="textSecondary" style={styles.monthLabel}>{month.label}</AppText><View style={styles.monthBars}><Bar color={colors.income} max={maxMonth} value={month.income} /><Bar color={colors.expense} max={maxMonth} value={month.expense} /></View></View>)}<View style={styles.chartTotals}><AppText variant="caption" color="textMuted">Income {formatMoney(incomeTotal)}</AppText><AppText variant="caption" color="textMuted">Expenses {formatMoney(expenseTotal)}</AppText></View></Card>
        <SectionHeader title="Spending by category" /><Card style={styles.chartCard}>{categoryTotals.length ? categoryTotals.map((item) => <View key={item.category} style={styles.categoryRow}><View style={styles.categoryHeading}><AppText variant="captionStrong">{item.category}</AppText><AppText variant="caption" color="textSecondary">{formatMoney(item.total)}</AppText></View><Bar color={colors.expense} max={maxCategory} value={item.total} /></View>) : <AppText variant="body" color="textMuted">No expenses to break down for these dates.</AppText>}</Card>
        <SectionHeader title="Savings progress" /><Card style={styles.chartCard}>{savingsGoals.length ? savingsGoals.map((goal) => <View key={goal.id} style={styles.categoryRow}><View style={styles.categoryHeading}><AppText variant="captionStrong">{goal.name}</AppText><AppText variant="caption" color="textSecondary">{formatMoney(goal.contributedMinor)} / {formatMoney(goal.targetMinor)}</AppText></View><Bar color={colors.primary} max={goal.targetMinor} value={goal.contributedMinor} /></View>) : <AppText variant="body" color="textMuted">Create a savings goal to see progress here.</AppText>}</Card>
      </>}
      <AppText variant="caption" color="textMuted" style={styles.rangeLabel}>Showing {from} to {to}. Transfers are excluded from income and expense totals.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  dateCard: { gap: spacing.md, marginBottom: spacing.md },
  summary: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, gap: spacing.xs, minWidth: 0 },
  income: { color: colors.income },
  expense: { color: colors.expense },
  insightCard: { gap: spacing.md, marginTop: spacing.md },
  chartCard: { gap: spacing.md },
  legend: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'flex-end' },
  monthRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  monthLabel: { width: 34 },
  monthBars: { flex: 1, gap: spacing.xs },
  track: { backgroundColor: colors.surfaceAlt, borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  bar: { borderRadius: 4, height: '100%' },
  chartTotals: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  categoryRow: { gap: spacing.xs },
  categoryHeading: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeLabel: { marginTop: spacing.xl },
});
