/**
 * Money is stored as integer minor units (ngwee) everywhere in the app.
 * Authoritative calculations (totals, balances, budget spending) only use
 * integer addition/subtraction. Formatting splits the integer instead of
 * dividing it, so no floating-point value ever represents money.
 */

const WHOLE_NUMBER_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

export function formatMoney(amountMinor: number): string {
  const safeAmount = Math.trunc(amountMinor);
  const sign = safeAmount < 0 ? '-' : '';
  const absolute = Math.abs(safeAmount);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  const grouped = String(whole).replace(WHOLE_NUMBER_PATTERN, ',');

  return `${sign}K${grouped}.${String(fraction).padStart(2, '0')}`;
}

export function formatSignedMoney(amountMinor: number, type: 'income' | 'expense'): string {
  const prefix = type === 'income' ? '+' : '-';
  return `${prefix}${formatMoney(Math.abs(amountMinor))}`;
}

/**
 * Parses a user-entered decimal string into integer minor units without using
 * floating-point arithmetic. Returns null when the value is not valid.
 */
export function parseAmountToMinor(input: string): number | null {
  const normalized = input.trim().replace(/,/g, '');

  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = Number.parseInt(wholePart, 10);
  const fraction = Number.parseInt(fractionPart.padEnd(2, '0'), 10);

  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction)) {
    return null;
  }

  return whole * 100 + fraction;
}

/** Integer percentage for display only (0-100, clamped). */
export function percentageOf(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((Math.max(0, value) * 100) / total));
}

/** Formats integer minor units as an editable decimal string, e.g. `1250.50`. */
export function formatAmountInput(amountMinor: number): string {
  const safeAmount = Math.max(0, Math.trunc(amountMinor));
  const whole = Math.floor(safeAmount / 100);
  const fraction = safeAmount % 100;

  return `${whole}.${String(fraction).padStart(2, '0')}`;
}
