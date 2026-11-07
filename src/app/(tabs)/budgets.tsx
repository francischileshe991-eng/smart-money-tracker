import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BudgetOverviewCard } from '@/components/budgets/budget-overview-card';
import { BudgetRow } from '@/components/budgets/budget-row';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { EXPENSE_CATEGORIES } from '@/data/categories';
import { useFinance } from '@/providers/finance-provider';
import { colors, spacing } from '@/theme';
import type { Budget, ExpenseCategory } from '@/types/finance';
import { formatAmountInput, formatMoney, parseAmountToMinor } from '@/utils/currency';
import { isValidIsoDate, todayIso } from '@/utils/date';

export default function BudgetsScreen() {
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
      <ScreenHeader subtitle="Set limits and keep spending on track" title="Budgets" />
      <BudgetOverviewCard budgets={budgets} />
      <SectionHeader title="Categories" actionLabel="Add budget" onAction={openNew} />
      {budgets.length ? <View style={styles.list}>{budgets.map((budget) => <BudgetRow budget={budget} key={budget.id} onPress={() => openEdit(budget)} />)}</View> : <Card><AppText variant="body" color="textSecondary">Create your first category budget to start tracking spending.</AppText><Button label="Create budget" onPress={openNew} style={styles.createButton} /></Card>}
      <SectionHeader title="Spending history" />
      <Card style={styles.history}>
        <AppText variant="caption" color="textMuted">All qualifying expenses, by month</AppText>
        {history.map((item) => <View key={item.month} style={styles.historyRow}><AppText variant="bodyStrong">{item.month}</AppText><AppText variant="bodyStrong">{formatMoney(item.total)}</AppText></View>)}
      </Card>
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
            <View style={styles.formGroup}><AppText variant="label" color="textSecondary">CATEGORY</AppText><View style={styles.chips}>{EXPENSE_CATEGORIES.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</View></View>
            <TextField label="Spending limit" keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" trailingText="ZMW" value={amount} />
            <View style={styles.formGroup}><AppText variant="label" color="textSecondary">BUDGET PERIOD</AppText><View style={styles.chips}><Chip label="Monthly" active={period === 'monthly'} onPress={() => setPeriod('monthly')} /><Chip label="Custom dates" active={period === 'custom'} onPress={() => setPeriod('custom')} /></View></View>
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
  list: { gap: spacing.sm },
  history: { gap: spacing.md },
  historyRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  formGroup: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  createButton: { marginTop: spacing.md },
  modalAction: { flex: 1 },
});
