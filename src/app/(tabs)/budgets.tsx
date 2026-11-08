import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BudgetOverviewCard } from '@/components/budgets/budget-overview-card';
import { BudgetRow } from '@/components/budgets/budget-row';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { EXPENSE_CATEGORIES } from '@/data/categories';
import { useFinance } from '@/providers/finance-provider';
import { spacing, useThemeColors } from '@/theme';
import type { Budget, ExpenseCategory } from '@/types/finance';
import { formatAmountInput, formatMoney, parseAmountToMinor } from '@/utils/currency';
import { isValidIsoDate, todayIso } from '@/utils/date';

export default function BudgetsScreen() {
  const colors = useThemeColors();
  const { budgets, transactions, saveBudget, deleteBudget } = useFinance();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState(todayIso().slice(0, 7) + '-01');
  const [endDate, setEndDate] = useState(todayIso());
  const [threshold, setThreshold] = useState('80');
  const [error, setError] = useState('');

  const history = useMemo(() => {
    const result: { month: string; total: number }[] = [];
    const now = new Date();
    for (let offset = 1; offset <= 3; offset += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const total = transactions.reduce((sum, txn) => sum + (txn.type === 'expense' && txn.date.startsWith(prefix) ? txn.amountMinor : 0), 0);
      result.push({ month: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), total });
    }
    return result;
  }, [transactions]);

  function openNew() {
    setEditing(null);
    const available = EXPENSE_CATEGORIES.find((item) => !budgets.some((budget) => budget.category === item));
    setCategory(available ?? 'Food');
    setAmount('');
    setPeriod('monthly');
    setStartDate(todayIso().slice(0, 7) + '-01');
    setEndDate(todayIso());
    setThreshold('80');
    setError('');
    setConfirmingDelete(false);
    setShowForm(true);
  }

  function openEdit(budget: Budget) {
    setEditing(budget);
    setCategory(budget.category);
    setAmount(formatAmountInput(budget.limitMinor));
    setPeriod(budget.period ?? 'monthly');
    setStartDate(budget.startDate ?? todayIso().slice(0, 7) + '-01');
    setEndDate(budget.endDate ?? todayIso());
    setThreshold(String(budget.warningThreshold ?? 80));
    setError('');
    setConfirmingDelete(false);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setConfirmingDelete(false);
  }

  function confirmDelete() {
    if (!editing) return;
    deleteBudget(editing.id);
    closeForm();
  }

  function submit() {
    const limitMinor = parseAmountToMinor(amount);
    const warningThreshold = Number(threshold);
    if (!limitMinor) { setError('Enter a budget amount greater than zero.'); return; }
    if (warningThreshold < 1 || warningThreshold > 100 || !Number.isInteger(warningThreshold)) { setError('Warning threshold must be between 1 and 100%.'); return; }
    if (period === 'custom' && (!isValidIsoDate(startDate) || !isValidIsoDate(endDate) || startDate > endDate)) { setError('Enter a valid date range in YYYY-MM-DD format.'); return; }
    const saved = saveBudget({ category, limitMinor, period, ...(period === 'custom' ? { startDate, endDate } : {}), warningThreshold }, editing?.id);
    if (!saved) { setError('A budget already exists for this category.'); return; }
    setShowForm(false);
  }

  return (
    <Screen>
      <ScreenHeader title="Budgets" right={budgets.length ? <Button label="Add budget" onPress={openNew} variant="outline" size="sm" /> : undefined} />
      {budgets.length ? <>
        <BudgetOverviewCard budgets={budgets} />
        <SectionHeader title="Categories" />
        <View>{budgets.map((budget) => <BudgetRow budget={budget} key={budget.id} onPress={() => openEdit(budget)} />)}</View>
      </> : <View style={styles.emptyState}>
        <AppText variant="h2">No budgets yet</AppText>
        <AppText color="textSecondary">Set a spending limit for a category.</AppText>
        <Button label="Add budget" onPress={openNew} variant="outline" style={styles.createButton} />
      </View>}
      <SectionHeader title="Monthly spending" />
      <View>
        {history.map((item) => <View key={item.month} style={[styles.historyRow, { borderBottomColor: colors.border }]}><AppText color="textSecondary">{item.month}</AppText><AppText variant="bodyStrong">{formatMoney(item.total)}</AppText></View>)}
      </View>
      <Modal
        actions={
          confirmingDelete ? (
            <>
              <Button label="Keep budget" onPress={() => setConfirmingDelete(false)} style={styles.modalAction} variant="secondary" />
              <Button label="Delete" onPress={confirmDelete} style={styles.modalAction} variant="danger" />
            </>
          ) : (
            <>
              <Button label="Cancel" onPress={closeForm} style={styles.modalAction} variant="secondary" />
              <Button label={editing ? 'Save changes' : 'Create budget'} onPress={submit} style={styles.modalAction} />
            </>
          )
        }
        description={confirmingDelete ? 'This permanently removes the budget. Existing transactions are not affected.' : undefined}
        onClose={closeForm}
        title={confirmingDelete ? 'Delete budget?' : editing ? 'Edit budget' : 'New budget'}
        visible={showForm}
        scrollable
      >
        {confirmingDelete ? (
          <AppText variant="body" color="textSecondary">{editing?.category} budget</AppText>
        ) : (
          <>
            <TextField label="Spending limit" variant="underlined" style={styles.amountInput} keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" trailingText="ZMW" value={amount} />
            <View style={styles.formGroup}><AppText variant="label" color="textSecondary">Category</AppText><View style={styles.chips}>{EXPENSE_CATEGORIES.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</View></View>
            <View style={styles.formGroup}>
              <AppText variant="label" color="textSecondary">Period</AppText>
              <View style={[styles.periodTabs, { borderBottomColor: colors.border }]}>
                {(['monthly', 'custom'] as const).map((option) => <Pressable key={option}
                  accessibilityRole="button" accessibilityState={{ selected: period === option }}
                  onPress={() => setPeriod(option)}
                  style={({ pressed }) => [styles.periodTab,
                    { borderBottomColor: period === option ? colors.text : 'transparent' }, pressed && styles.pressed]}>
                  <AppText variant={period === option ? 'bodyStrong' : 'body'} color={period === option ? 'text' : 'textSecondary'}>
                    {option === 'monthly' ? 'Monthly' : 'Custom dates'}
                  </AppText>
                </Pressable>)}
              </View>
            </View>
            {period === 'custom' ? <><TextField label="Start date" onChangeText={setStartDate} placeholder="YYYY-MM-DD" value={startDate} /><TextField label="End date" onChangeText={setEndDate} placeholder="YYYY-MM-DD" value={endDate} /></> : null}
            <TextField label="Warn me at" keyboardType="number-pad" onChangeText={setThreshold} trailingText="% used" value={threshold} />
            {error ? <AppText variant="caption" color="expense">{error}</AppText> : null}
            {editing ? <Button label="Delete budget" onPress={() => setConfirmingDelete(true)} variant="danger" /> : null}
          </>
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  historyRow: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', minHeight: 64, paddingVertical: spacing.lg },
  emptyState: { gap: spacing.md, paddingVertical: spacing.xxl },
  amountInput: { fontSize: 36, lineHeight: 48, minHeight: 72, fontWeight: '400', fontVariant: ['tabular-nums'] },
  periodTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  periodTab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2 },
  pressed: { opacity: 0.65 },
  formGroup: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  createButton: { marginTop: spacing.md },
  modalAction: { flex: 1 },
});
