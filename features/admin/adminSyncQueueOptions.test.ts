import { describe, expect, it } from 'vitest';

import {
  buildSyncQueueMenuOptions,
  syncQueueOptionLabel,
  syncQueuesTriggerLabel,
  toggleExtraSyncQueue,
} from './adminSyncQueueOptions';

describe('adminSyncQueueOptions', () => {
  it('lists team queues first and keeps them when searching', () => {
    const options = buildSyncQueueMenuOptions({
      catalog: [
        { key: 'RND', name: 'R&D' },
        { key: 'PAY', name: 'Payments' },
      ],
      extraKeys: ['PAY'],
      query: 'pay',
      searchHits: [],
      teamKeys: ['RND', 'RND'],
    });
    expect(options.map((option) => [option.key, option.locked])).toEqual([
      ['RND', true],
      ['PAY', false],
    ]);
  });

  it('adds a catalog match that is not on a team', () => {
    const options = buildSyncQueueMenuOptions({
      catalog: [{ key: 'OPS', name: 'Ops' }],
      extraKeys: [],
      query: 'op',
      searchHits: [{ key: 'OPS', name: 'Operations' }],
      teamKeys: ['RND'],
    });
    expect(options.map((option) => option.key)).toEqual(['RND', 'OPS']);
    expect(options[1]).toMatchObject({ locked: false, name: 'Operations' });
  });

  it('does not remove a team queue from extras', () => {
    expect(toggleExtraSyncQueue(['PAY'], ['RND'], 'RND')).toEqual(['PAY']);
    expect(toggleExtraSyncQueue(['PAY'], ['RND'], 'PAY')).toEqual([]);
    expect(toggleExtraSyncQueue(['PAY'], ['RND'], 'OPS')).toEqual(['PAY', 'OPS']);
  });

  it('formats the closed selector label', () => {
    expect(syncQueuesTriggerLabel([], [], 'empty', (count) => String(count))).toBe('empty');
    expect(syncQueuesTriggerLabel(['RND'], ['PAY'], 'empty', (count) => String(count))).toBe(
      'RND, PAY'
    );
    expect(
      syncQueuesTriggerLabel(['A', 'B'], ['C', 'D'], 'empty', (count) => `${count} queues`)
    ).toBe('4 queues');
    expect(syncQueueOptionLabel({ key: 'RND', name: 'R&D' })).toBe('R&D · RND');
    expect(syncQueueOptionLabel({ key: 'RND', name: 'RND' })).toBe('RND');
  });
});
