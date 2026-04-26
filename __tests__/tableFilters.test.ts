import { describe, expect, it } from 'vitest';
import { filterTableRows } from '../src/hooks/useTableFilters';

interface FakeRow {
  id: string;
  name: string;
  email: string;
  exam: string;
  status: 'in_progress' | 'completed';
  show_to_student: boolean;
  heat: number;
}

const rows: FakeRow[] = [
  {
    id: 'abc-1111',
    name: 'Alice Doe',
    email: 'alice@example.com',
    exam: 'Algorithms',
    status: 'completed',
    show_to_student: true,
    heat: 0,
  },
  {
    id: 'def-2222',
    name: 'Bob Smith',
    email: 'bob@example.com',
    exam: 'Databases',
    status: 'in_progress',
    show_to_student: false,
    heat: 3,
  },
  {
    id: 'ghi-3333',
    name: 'Charlie Khan',
    email: 'charlie@example.com',
    exam: 'Algorithms',
    status: 'completed',
    show_to_student: false,
    heat: 1,
  },
];

describe('filterTableRows', () => {
  it('filters by search query across composed text fields', () => {
    const filtered = filterTableRows({
      rows,
      query: 'alice',
      searchText: (row) => `${row.name} ${row.email} ${row.exam} ${row.id}`,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('abc-1111');
  });

  it('applies filter predicates using non-all values', () => {
    const filtered = filterTableRows({
      rows,
      query: '',
      filters: {
        status: 'completed',
        visibility: 'hidden',
      },
      searchText: (row) => `${row.name} ${row.email} ${row.exam} ${row.id}`,
      filterPredicates: {
        status: (row, value) => row.status === value,
        visibility: (row, value) => (value === 'published' ? row.show_to_student : !row.show_to_student),
      },
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('ghi-3333');
  });

  it('intersects search and filter constraints', () => {
    const filtered = filterTableRows({
      rows,
      query: 'algorithms',
      filters: {
        heat: 'flagged',
      },
      searchText: (row) => `${row.name} ${row.email} ${row.exam} ${row.id}`,
      filterPredicates: {
        heat: (row, value) => (value === 'clean' ? row.heat === 0 : row.heat > 0),
      },
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('ghi-3333');
  });
});
