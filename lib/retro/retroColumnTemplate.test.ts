import { describe, expect, it } from 'vitest';

import { parseRetroColumnTemplate } from './retroBoard';
import {
  addRetroTemplateColumn,
  moveRetroTemplateColumn,
  removeRetroTemplateColumn,
} from './retroColumnTemplate';

const COLUMNS = [
  { id: 'agreements', preset: 'agreements' as const, role: 'agreements' as const, title: '' },
  { id: 'glad', preset: 'glad' as const, role: null, title: '' },
  { id: 'sad', preset: 'sad' as const, role: null, title: 'Rough' },
];

describe('retro column template', () => {
  it('keeps agreements first and present', () => {
    const parsed = parseRetroColumnTemplate([
      { id: 'glad', preset: 'glad', role: null, title: 'Glad' },
      { id: 'pacts', preset: 'agreements', role: 'agreements', title: 'Pacts' },
    ]);
    expect(parsed?.map((column) => column.id)).toEqual(['pacts', 'glad']);
    expect(removeRetroTemplateColumn(COLUMNS, 'agreements')).toBe(COLUMNS);
  });

  it('does not move another column ahead of agreements', () => {
    expect(moveRetroTemplateColumn(COLUMNS, 'glad', -1)).toBe(COLUMNS);
    expect(moveRetroTemplateColumn(COLUMNS, 'sad', -1).map((column) => column.id)).toEqual([
      'agreements',
      'sad',
      'glad',
    ]);
  });

  it('appends a named column', () => {
    const next = addRetroTemplateColumn(COLUMNS, '  Parking lot  ');
    expect(next.at(-1)?.title).toBe('Parking lot');
    expect(next.at(-1)?.role).toBeNull();
  });

  it('rejects a template that is not a column list', () => {
    expect(parseRetroColumnTemplate({ title: 'nope' })).toBeNull();
  });
});
