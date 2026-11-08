import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Icon } from './icon';
import { Modal } from './modal';

import { radii, spacing, useThemeColors } from '@/theme';
import { formatDateLabel, formatLongDate, todayIso } from '@/utils/date';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
};

function isoFromParts(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseIso(isoDate: string): { year: number; monthIndex: number; day: number } {
  const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10));

  return { year, monthIndex: month - 1, day };
}

function buildMonthCells(year: number, monthIndex: number): (number | null)[] {
  const firstWeekday = (new Date(year, monthIndex, 1, 12).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseIso(value), [value]);
  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.monthIndex);
  const today = todayIso();

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewMonth, viewYear]);
  const monthTitle = new Date(viewYear, viewMonth, 1, 12).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  function changeMonth(offset: number) {
    const next = new Date(viewYear, viewMonth + offset, 1, 12);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function selectDay(day: number) {
    onChange(isoFromParts(viewYear, viewMonth, day));
    setOpen(false);
  }

  return (
    <View style={styles.container}>
      {label ? (
        <AppText variant="label" color="textSecondary">
          {label}
        </AppText>
      ) : null}

      <Pressable
        accessibilityLabel={label ? `${label}: ${formatDateLabel(value)}` : formatDateLabel(value)}
        accessibilityRole="button"
        onPress={() => {
          setViewYear(selected.year);
          setViewMonth(selected.monthIndex);
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: colors.surface, borderColor: error ? colors.expense : colors.border },
          pressed && styles.pressed,
        ]}
      >
        <Icon name="calendar" size={18} color="textMuted" />
        <AppText variant="body" style={styles.value}>
          {formatDateLabel(value)}
        </AppText>
        <Icon name="chevronRight" size={14} color="textMuted" />
      </Pressable>

      {error ? (
        <AppText variant="caption" color="expense">
          {error}
        </AppText>
      ) : null}

      <Modal onClose={() => setOpen(false)} title="Select date" visible={open}>
        <View style={styles.monthRow}>
          <Pressable
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => changeMonth(-1)}
            style={({ pressed }) => [styles.monthButton, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}
          >
            <Icon name="back" size={18} color="textSecondary" />
          </Pressable>

          <AppText variant="bodyStrong" style={styles.monthTitle}>
            {monthTitle}
          </AppText>

          <Pressable
            accessibilityLabel="Next month"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => changeMonth(1)}
            style={({ pressed }) => [styles.monthButton, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}
          >
            <Icon name="chevronRight" size={18} color="textSecondary" />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((weekday) => (
            <View key={weekday} style={styles.weekCell}>
              <AppText variant="caption" color="textMuted">
                {weekday}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const isoDate = isoFromParts(viewYear, viewMonth, day);
            const isSelected = isoDate === value;
            const isToday = isoDate === today;

            return (
              <Pressable
                accessibilityLabel={formatLongDate(isoDate)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={isoDate}
                onPress={() => selectDay(day)}
                style={({ pressed }) => [
                  styles.dayCell,
                  styles.dayPressable,
                  isToday && !isSelected && { borderColor: colors.primaryMuted, borderWidth: 1 },
                  isSelected && { backgroundColor: colors.primaryButton },
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="body"
                  color={isSelected ? 'textInverse' : 'text'}
                  style={styles.dayText}
                >
                  {day}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  field: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  value: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  monthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekCell: {
    alignItems: 'center',
    flexBasis: '14.2857%',
    paddingVertical: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    flexBasis: '14.2857%',
    justifyContent: 'center',
  },
  dayPressable: {
    borderRadius: radii.pill,
  },
  dayText: {
    textAlign: 'center',
  },
});
