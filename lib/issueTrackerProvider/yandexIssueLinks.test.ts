import { describe, expect, it, vi } from 'vitest';

import {
  createYandexIssueLink,
  mapYandexIssueLinkPayload,
  mapYandexIssueLinksPayload,
} from './yandexIssueLinks';

describe('yandexIssueLinks', () => {
  it('maps depends outward as blocks and depends inward as blocked_by', () => {
    expect(
      mapYandexIssueLinkPayload({
        id: 10,
        direction: 'outward',
        type: { id: 'depends', inward: 'depends on', outward: 'is dependent by' },
        object: { key: 'BT-2', display: 'Blocked task' },
        status: { display: 'Open' },
      })
    ).toEqual({
      id: '10',
      direction: 'outward',
      relationship: 'blocks',
      linkedIssueKey: 'BT-2',
      linkedSummary: 'Blocked task',
      linkedStatus: 'Open',
    });

    expect(
      mapYandexIssueLinkPayload({
        id: 11,
        direction: 'inward',
        type: { id: 'depends', inward: 'depends on', outward: 'is dependent by' },
        object: { key: 'BT-3', display: 'Blocker' },
      })
    ).toMatchObject({
      id: '11',
      relationship: 'blocked_by',
      linkedIssueKey: 'BT-3',
    });
  });

  it('skips hierarchy and incomplete payloads', () => {
    expect(
      mapYandexIssueLinksPayload([
        {
          id: 1,
          direction: 'outward',
          type: { outward: 'is subtask for', inward: 'is parent task for' },
          object: { key: 'BT-9' },
        },
        { id: 2, direction: 'outward', type: { outward: 'relates' }, object: {} },
        {
          id: 3,
          direction: 'outward',
          type: { outward: 'relates' },
          object: { key: 'BT-4', display: 'Related' },
        },
      ])
    ).toEqual([
      {
        id: '3',
        direction: 'outward',
        relationship: 'relates',
        linkedIssueKey: 'BT-4',
        linkedSummary: 'Related',
        linkedStatus: null,
      },
    ]);
  });

  it('creates a link via Tracker POST relationship mapping', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: {
        id: 99,
        direction: 'outward',
        type: { outward: 'depends on', inward: 'is dependent by' },
        object: { key: 'BT-5', display: 'Dep' },
      },
    });
    const link = await createYandexIssueLink({ post } as never, 'BT-1', {
      relationship: 'blocked_by',
      targetIssueKey: 'BT-5',
    });
    expect(post).toHaveBeenCalledWith('/issues/BT-1/links', {
      relationship: 'depends on',
      issue: 'BT-5',
    });
    expect(link).toMatchObject({
      id: '99',
      relationship: 'blocked_by',
      linkedIssueKey: 'BT-5',
    });
  });
});
