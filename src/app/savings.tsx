import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SavingsGoalProgress } from '@/components/savings/savings-goal-progress';
import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { useFinance } from '@/providers/finance-provider';
import { colors, spacing } from '@/theme';
import type { SavingsGoal } from '@/types/finance';
import { formatAmountInput, formatMoney, parseAmountToMinor } from '@/utils/currency';
import { isValidIsoDate } from '@/utils/date';

type ModalMode = 'goal' | 'contribution' | 'withdrawal' | 'delete' | null;

export default function SavingsScreen() {
  const { savingsGoals, saveGoal, deleteGoal, recordGoalContribution, setGoalCompleted } = useFinance();
  const [selected, setSelected] = useState<SavingsGoal | null>(null);
  const [mode, setMode] = useState<ModalMode>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const currentGoal = selected ? savingsGoals.find((goal) => goal.id === selected.id) ?? null : null;

  function createGoal() {
    setSelected(null); setName(''); setTarget(''); setTargetDate(''); setError(''); setMode('goal');
  }
  function editGoal(goal: SavingsGoal) {
    setSelected(goal); setName(goal.name); setTarget(formatAmountInput(goal.targetMinor)); setTargetDate(goal.targetDate ?? ''); setError(''); setMode('goal');
  }
  function saveGoalForm() {
    const targetMinor = parseAmountToMinor(target);
    if (!name.trim()) { setError('Enter a name for this goal.'); return; }
    if (!targetMinor) { setError('Enter a target amount greater than zero.'); return; }
    if (targetDate && !isValidIsoDate(targetDate)) { setError('Enter a valid target date in YYYY-MM-DD format.'); return; }
    if (!saveGoal({ name: name.trim(), targetMinor, ...(targetDate ? { targetDate } : {}), ...(selected ? { completed: selected.completed } : {}) }, selected?.id)) { setError('Could not save this goal.'); return; }
    setMode(null);
  }
  function saveActivity(type: 'contribution' | 'withdrawal') {
    const amountMinor = parseAmountToMinor(amount);
    if (!amountMinor) { setError('Enter an amount greater than zero.'); return; }
    if (!selected || !recordGoalContribution(selected.id, amountMinor, type)) { setError('The amount exceeds the goal balance.'); return; }
    setAmount(''); setError(''); setMode(null);
  }
  function openActivity(nextMode: 'contribution' | 'withdrawal') {
    setAmount(''); setError(''); setMode(nextMode);
  }

  return (
    <Screen>
      <BackLink />
      <ScreenHeader subtitle="Plan, contribute, and track your progress" title="Savings goals" />
      <SectionHeader title="Your goals" actionLabel="New goal" onAction={createGoal} />
      {savingsGoals.length ? <View style={styles.list}>{savingsGoals.map((goal) => <Pressable key={goal.id} accessibilityRole="button" onPress={() => setSelected(goal)}><Card style={styles.goalCard}><SavingsGoalProgress goal={goal} />{goal.targetDate ? <AppText variant="caption" color="textMuted">Target date: {goal.targetDate}</AppText> : null}{goal.completed ? <AppText variant="captionStrong" color="income">Completed</AppText> : null}</Card></Pressable>)}</View> : <Card><AppText variant="body" color="textSecondary">Create a savings goal and track contributions over time.</AppText><Button label="Create a goal" onPress={createGoal} style={styles.gapTop} /></Card>}
      <Card style={styles.note}><AppText variant="caption" color="textSecondary">Goal contributions are tracked separately from account transactions. They only affect account balances when you record a real expense or transfer.</AppText></Card>

      <Modal actions={<><Button label="Cancel" onPress={() => setMode(null)} variant="secondary" /><Button label={selected ? 'Save changes' : 'Create goal'} onPress={saveGoalForm} /></>} onClose={() => setMode(null)} title={selected ? 'Edit goal' : 'New savings goal'} visible={mode === 'goal'}>
        <TextField label="Goal name" onChangeText={setName} placeholder="e.g. Emergency fund" value={name} />
        <TextField label="Target amount" keyboardType="decimal-pad" onChangeText={setTarget} placeholder="0.00" trailingText="ZMW" value={target} />
        <TextField label="Target date (optional)" onChangeText={setTargetDate} placeholder="YYYY-MM-DD" value={targetDate} />
        {error ? <AppText variant="caption" color="expense">{error}</AppText> : null}
      </Modal>

      <Modal onClose={() => setMode(null)} title={mode === 'contribution' ? 'Add contribution' : 'Withdraw contribution'} visible={mode === 'contribution' || mode === 'withdrawal'} actions={<><Button label="Cancel" onPress={() => setMode(null)} variant="secondary" /><Button label={mode === 'contribution' ? 'Add' : 'Withdraw'} onPress={() => saveActivity(mode === 'withdrawal' ? 'withdrawal' : 'contribution')} /></>}>
        <AppText variant="body" color="textSecondary">{selected?.name} · {formatMoney(selected?.contributedMinor ?? 0)} available</AppText>
        <TextField label="Amount" keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" trailingText="ZMW" value={amount} />
        {error ? <AppText variant="caption" color="expense">{error}</AppText> : null}
      </Modal>

      <Modal onClose={() => setSelected(null)} title={currentGoal?.name ?? 'Savings goal'} visible={Boolean(currentGoal) && mode === null} scrollable actions={currentGoal ? <><Button label="Edit" onPress={() => editGoal(currentGoal)} variant="secondary" /><Button label={currentGoal.completed ? 'Reopen' : 'Mark complete'} onPress={() => setGoalCompleted(currentGoal.id, !currentGoal.completed)} /></> : null}>
        {currentGoal ? <>
          <SavingsGoalProgress goal={currentGoal} />
          {currentGoal.targetDate ? <AppText variant="caption" color="textMuted">Target date: {currentGoal.targetDate}</AppText> : null}
          <View style={styles.actions}><Button label="Contribute" onPress={() => openActivity('contribution')} /><Button label="Withdraw" onPress={() => openActivity('withdrawal')} variant="secondary" /></View>
          <SectionHeader title="Contribution history" />
          {currentGoal.history?.length ? [...currentGoal.history].reverse().map((event) => <View key={event.id} style={styles.historyRow}><View><AppText variant="bodyStrong">{event.type === 'contribution' ? 'Contribution' : 'Withdrawal'}</AppText><AppText variant="caption" color="textMuted">{event.date}</AppText></View><AppText variant="bodyStrong" color={event.type === 'contribution' ? 'income' : 'expense'}>{event.type === 'contribution' ? '+' : '−'}{formatMoney(event.amountMinor)}</AppText></View>) : <AppText variant="caption" color="textMuted">No contributions recorded yet.</AppText>}
          <Button label="Delete goal" onPress={() => setMode('delete')} variant="danger" />
        </> : null}
      </Modal>

      <Modal
        actions={
          <>
            <Button label="Keep goal" onPress={() => setMode(null)} style={styles.modalAction} variant="secondary" />
            <Button
              label="Delete"
              onPress={() => {
                if (currentGoal) deleteGoal(currentGoal.id);
                setSelected(null);
                setMode(null);
              }}
              style={styles.modalAction}
              variant="danger"
            />
          </>
        }
        description="This permanently removes the goal and its contribution history. Account balances and transactions are not affected."
        onClose={() => setMode(null)}
        title="Delete savings goal?"
        visible={mode === 'delete' && Boolean(currentGoal)}
      >
        {currentGoal ? (
          <AppText variant="body" color="textSecondary">
            {currentGoal.name} · {formatMoney(currentGoal.contributedMinor)} saved
          </AppText>
        ) : null}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  goalCard: { gap: spacing.sm },
  note: { marginTop: spacing.xl },
  gapTop: { marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  modalAction: { flex: 1 },
  historyRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
});
