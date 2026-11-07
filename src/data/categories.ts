import type { IconName } from '@/components/ui/icon';
import type {
  Category,
  ExpenseCategory,
  IncomeCategory,
  TransactionType,
} from '@/types/finance';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Accommodation',
  'Airtime and data',
  'Education',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Personal care',
  'Utilities',
  'Other expenses',
] as const satisfies readonly ExpenseCategory[];

export const INCOME_CATEGORIES = [
  'Allowance',
  'Salary',
  'Freelance',
  'Business',
  'Scholarship',
  'Gifts',
  'Other income',
] as const satisfies readonly IncomeCategory[];

const CATEGORY_ICONS: Record<Category, IconName> = {
  Food: 'food',
  Transport: 'transport',
  Accommodation: 'accommodation',
  'Airtime and data': 'airtime',
  Education: 'education',
  Entertainment: 'entertainment',
  Shopping: 'shopping',
  Healthcare: 'healthcare',
  'Personal care': 'personalCare',
  Utilities: 'utilities',
  'Other expenses': 'otherExpenses',
  Allowance: 'allowance',
  Salary: 'salary',
  Freelance: 'freelance',
  Business: 'business',
  Scholarship: 'scholarship',
  Gifts: 'gifts',
  'Other income': 'otherIncome',
};

export function categoriesFor(type: Exclude<TransactionType, 'transfer'>): readonly Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getCategoryIcon(category: Category): IconName {
  return CATEGORY_ICONS[category];
}
