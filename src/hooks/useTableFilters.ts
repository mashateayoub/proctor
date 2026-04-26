'use client';

import { useMemo } from 'react';

export type TableFilterPredicates<T> = Record<string, (row: T, value: string) => boolean>;

interface FilterTableRowsParams<T> {
  rows: T[];
  query: string;
  filters?: Record<string, string>;
  searchText: (row: T) => string;
  filterPredicates?: TableFilterPredicates<T>;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function filterTableRows<T>({
  rows,
  query,
  filters = {},
  searchText,
  filterPredicates = {},
}: FilterTableRowsParams<T>) {
  const normalizedQuery = normalizeText(query);

  return rows.filter((row) => {
    if (normalizedQuery) {
      const haystack = normalizeText(searchText(row));
      if (!haystack.includes(normalizedQuery)) return false;
    }

    for (const [filterKey, filterValue] of Object.entries(filters)) {
      if (!filterValue || filterValue === 'all') continue;
      const predicate = filterPredicates[filterKey];
      if (predicate && !predicate(row, filterValue)) return false;
    }

    return true;
  });
}

export function useTableFilters<T>({
  rows,
  query,
  filters = {},
  searchText,
  filterPredicates = {},
}: FilterTableRowsParams<T>) {
  return useMemo(
    () =>
      filterTableRows({
        rows,
        query,
        filters,
        searchText,
        filterPredicates,
      }),
    [rows, query, filters, searchText, filterPredicates]
  );
}
