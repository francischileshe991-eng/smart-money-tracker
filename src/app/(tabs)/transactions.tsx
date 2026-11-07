import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { TransactionItem } from '@/components/transactions/transaction-item';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/data/categories';
import { useFinance } from '@/providers/finance-provider';
import { colors, radii, spacing } from '@/theme';
import type { Category, Transaction } from '@/types/finance';
import { todayIso } from '@/utils/date';
import {
  filterAndSortTransactions,
  transactionAccountLabel,
  type TransactionCategoryFilter,
  type TransactionSortOption,
  type TransactionTypeFilter,
} from '@/utils/transaction-query';

type Filters = {
  category: TransactionCategoryFilter;
  fromDate: string | null;
  toDate: string | null;
};

const DEFAULT_FILTERS: Filters = {
  category: 'all',
  fromDate: null,
  toDate: null,
};

const ALL_CATEGORIES: readonly Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const TYPE_FILTERS: {
  label: string;
  value: TransactionTypeFilter;
  tone: 'default' | 'income' | 'expense';
}[] = [
  { label: 'All', value: 'all', tone: 'default' },
  { label: 'Income', value: 'income', tone: 'income' },
  { label: 'Expenses', value: 'expense', tone: 'expense' },
  { label: 'Transfers', value: 'transfer', tone: 'default' },
];

const SORT_OPTIONS: { label: string; description: string; value: TransactionSortOption }[] = [
  { label: 'Newest first', description: 'Most recent date at the top', value: 'date-desc' },
  { label: 'Oldest first', description: 'Earliest date at the top', value: 'date-asc' },
  { label: 'Highest amount', description: 'Largest transactions first', value: 'amount-desc' },
  { label: 'Lowest amount', description: 'Smallest transactions first', value: 'amount-asc' },
];

const SORT_BUTTON_LABELS: Record<TransactionSortOption, string> = {
  'date-desc': 'Newest',
  'date-asc': 'Oldest',
  'amount-desc': 'Highest',
  'amount-asc': 'Lowest',
};

function categoriesForFilter(filter: TransactionTypeFilter): readonly Category[] {
  if (filter === 'income') {
    return INCOME_CATEGORIES;
  }

  if (filter === 'expense') {
    return EXPENSE_CATEGORIES;
  }

  if (filter === 'transfer') {
    return [];
  }

  return ALL_CATEGORIES;
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

type DateFilterFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

function DateFilterField({ label, value, onChange }: DateFilterFieldProps) {
  return (
    <View style={styles.dateFilterField}>
      <View style={styles.dateFilterHeader}>
        <AppText variant="captionStrong" color="textSecondary">
          {label}
        </AppText>
        {value ? (
          <Pressable
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onChange(null)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <AppText variant="captionStrong" color="primary">
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {value ? (
        <DateField onChange={onChange} value={value} />
      ) : (
        <Pressable
          accessibilityLabel={`Set ${label.toLowerCase()}`}
          accessibilityRole="button"
          onPress={() => onChange(todayIso())}
          style={({ pressed }) => [styles.anyDateButton, pressed && styles.pressed]}
        >
          <Icon name="calendar" size={18} color="textMuted" />
          <AppText variant="body" color="textMuted" style={styles.anyDateText}>
            Any date
          </AppText>
          <AppText variant="caption" color="textMuted">
            Tap to set
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

export default function TransactionsScreen() {
  const { allAccounts, transactions } = useFinance();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortOption, setSortOption] = useState<TransactionSortOption>('date-desc');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const accountNames = useMemo(
    () => new Map(allAccounts.map((account) => [account.id, account.name])),
    [allAccounts]
  );
  const filterCategories = categoriesForFilter(typeFilter);

  const filteredTransactions = useMemo(
    () =>
      filterAndSortTransactions(
        transactions,
        {
          query,
          type: typeFilter,
          category: filters.category,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          sort: sortOption,
        },
        accountNames
      ),
    [accountNames, filters, query, sortOption, transactions, typeFilter]
  );

  const filterCount =
    (filters.category === 'all' ? 0 : 1) +
    (filters.fromDate ? 1 : 0) +
    (filters.toDate ? 1 : 0);
  const hasActiveFilters =
    query.trim().length > 0 || typeFilter !== 'all' || filterCount > 0;

  function selectTypeFilter(nextFilter: TransactionTypeFilter) {
    setTypeFilter(nextFilter);

    if (
      filters.category !== 'all' &&
      !categoriesForFilter(nextFilter).includes(filters.category)
    ) {
      setFilters((current) => ({ ...current, category: 'all' }));
    }
  }

  function openFilterModal() {
    setDraftFilters(filters);
    setDateError(null);
    setFilterModalVisible(true);
  }

  function applyFilters() {
    if (
      draftFilters.fromDate &&
      draftFilters.toDate &&
      draftFilters.fromDate > draftFilters.toDate
    ) {
      setDateError('The start date must be on or before the end date.');
      return;
    }

    setFilters(draftFilters);
    setDateError(null);
    setFilterModalVisible(false);
  }

  function clearAllFilters() {
    setQuery('');
    setTypeFilter('all');
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={filteredTransactions}
        ItemSeparatorComponent={ListSeparator}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(transaction: Transaction) => transaction.id}
        ListEmptyComponent={
          <EmptyState
            action={
              hasActiveFilters ? (
                <Button label="Clear filters" onPress={clearAllFilters} variant="secondary" />
              ) : undefined
            }
            icon={hasActiveFilters ? 'search' : 'transactions'}
            message={
              hasActiveFilters
                ? 'Try a different search term, category, date range or transaction type.'
                : 'Income, expenses and transfers you add will appear here.'
            }
            title={hasActiveFilters ? 'No matching transactions' : 'No transactions yet'}
          />
        }
        ListFooterComponent={<View style={styles.footerSpace} />}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              right={
                <Button
                  icon="add"
                  label="Add"
                  onPress={() => router.navigate('/add')}
                  size="sm"
                  variant="secondary"
                />
              }
              subtitle="Search, filter and review your activity"
              title="Transactions"
            />

            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              leadingIcon="search"
              onChangeText={setQuery}
              placeholder="Search description, category or account"
              returnKeyType="search"
              value={query}
            />

            <View style={styles.filters}>
              {TYPE_FILTERS.map((option) => (
                <Chip
                  active={typeFilter === option.value}
                  key={option.value}
                  label={option.label}
                  onPress={() => selectTypeFilter(option.value)}
                  tone={option.tone}
                />
              ))}
            </View>

            <View style={styles.controls}>
              <Button
                icon="filter"
                label={filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
                onPress={openFilterModal}
                size="sm"
                style={styles.control}
                variant={filterCount > 0 ? 'secondary' : 'ghost'}
              />
              <Button
                icon="sort"
                label={SORT_BUTTON_LABELS[sortOption]}
                onPress={() => setSortModalVisible(true)}
                size="sm"
                style={styles.control}
                variant="ghost"
              />
            </View>

            <View style={styles.resultRow}>
              <AppText variant="caption" color="textMuted">
                {filteredTransactions.length}{' '}
                {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
              </AppText>
              {hasActiveFilters ? (
                <Pressable
                  accessibilityLabel="Clear all filters"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={clearAllFilters}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <AppText variant="captionStrong" color="primary">
                    Clear all
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TransactionItem
            accountLabel={transactionAccountLabel(item, accountNames)}
            onPress={() =>
              router.navigate({ pathname: '/transaction/[id]', params: { id: item.id } })
            }
            transaction={item}
          />
        )}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />

      <Modal
        actions={
          <>
            <Button
              label="Reset"
              onPress={() => {
                setDraftFilters(DEFAULT_FILTERS);
                setDateError(null);
              }}
              style={styles.modalAction}
              variant="secondary"
            />
            <Button label="Apply filters" onPress={applyFilters} style={styles.modalAction} />
          </>
        }
        description="Narrow transactions by category or date range."
        onClose={() => setFilterModalVisible(false)}
        scrollable
        title="Filter transactions"
        visible={filterModalVisible}
      >
        {typeFilter !== 'transfer' ? (
          <View style={styles.fieldGroup}>
            <AppText variant="label" color="textSecondary">
              Category
            </AppText>
            <View style={styles.chipRow}>
              <Chip
                active={draftFilters.category === 'all'}
                label="All categories"
                onPress={() =>
                  setDraftFilters((current) => ({ ...current, category: 'all' }))
                }
              />
              {filterCategories.map((option) => (
                <Chip
                  active={draftFilters.category === option}
                  key={option}
                  label={option}
                  onPress={() =>
                    setDraftFilters((current) => ({ ...current, category: option }))
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <AppText variant="label" color="textSecondary">
            Date range
          </AppText>
          <DateFilterField
            label="From"
            onChange={(fromDate) =>
              setDraftFilters((current) => ({ ...current, fromDate }))
            }
            value={draftFilters.fromDate}
          />
          <DateFilterField
            label="To"
            onChange={(toDate) => setDraftFilters((current) => ({ ...current, toDate }))}
            value={draftFilters.toDate}
          />
          {dateError ? (
            <AppText variant="caption" color="expense">
              {dateError}
            </AppText>
          ) : null}
        </View>
      </Modal>

      <Modal
        onClose={() => setSortModalVisible(false)}
        title="Sort transactions"
        visible={sortModalVisible}
      >
        {SORT_OPTIONS.map((option) => {
          const active = option.value === sortOption;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option.value}
              onPress={() => {
                setSortOption(option.value);
                setSortModalVisible(false);
              }}
              style={({ pressed }) => [
                styles.sortOption,
                active && styles.sortOptionActive,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.sortText}>
                <AppText variant="bodyStrong" color={active ? 'primary' : 'text'}>
                  {option.label}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {option.description}
                </AppText>
              </View>
              {active ? <Icon name="check" size={18} color="primary" /> : null}
            </Pressable>
          );
        })}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  control: {
    flex: 1,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  separator: {
    height: spacing.sm,
  },
  footerSpace: {
    height: spacing.xxxl,
  },
  pressed: {
    opacity: 0.65,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateFilterField: {
    gap: spacing.xs,
  },
  dateFilterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  anyDateButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  anyDateText: {
    flex: 1,
  },
  modalAction: {
    flex: 1,
  },
  sortOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  sortOptionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  sortText: {
    flex: 1,
    gap: 2,
  },
});
