function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** True when `value` is a real calendar date in ISO `YYYY-MM-DD` form. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T12:00:00`);

  return !Number.isNaN(date.getTime()) && toIsoDate(date) === value;
}

export function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toIsoDate(date);
}

/** ISO year-month prefix for the current calendar month, e.g. `2026-11`. */
export function currentMonthPrefix(): string {
  return todayIso().slice(0, 7);
}

/** Full month name for the current calendar month, e.g. `November`. */
export function currentMonthLabel(): string {
  return new Date().toLocaleDateString('en-GB', { month: 'long' });
}

function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

export function formatTransactionDate(isoDate: string): string {
  if (isoDate === todayIso()) {
    return 'Today';
  }

  if (isoDate === daysAgoIso(1)) {
    return 'Yesterday';
  }

  return parseIsoDate(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatLongDate(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateLabel(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
