import { describe, expect, it } from 'vitest';

import {
  mapTrackerIssueLinkEdgesToTaskLinks,
  mergePlannerAndTrackerTaskLinks,
  parseTrackerOverlayLinkId,
  toTrackerOverlayLinkId,
} from './trackerLinkOverlay';

describe('trackerLinkOverlay', () => {
  it('round-trips tracker overlay ids', () => {
    expect(toTrackerOverlayLinkId('99')).toBe('tracker:99');
    expect(parseTrackerOverlayLinkId('tracker:99')).toBe('99');
    expect(parseTrackerOverlayLinkId('link-1')).toBeNull();
  });

  it('maps edges only when both ends are on the board', () => {
    const map = new Map([
      ['A-1', 'A-1'],
      ['B-2', 'B-2'],
    ]);
    const links = mapTrackerIssueLinkEdgesToTaskLinks(
      [
        {
          id: '1',
          fromIssueKey: 'A-1',
          toIssueKey: 'B-2',
          relationship: 'relates',
          direction: 'outward',
        },
        {
          id: '2',
          fromIssueKey: 'A-1',
          toIssueKey: 'Z-9',
          relationship: 'blocks',
          direction: 'outward',
        },
      ],
      map
    );
    expect(links).toEqual([
      {
        id: 'tracker:1',
        fromTaskId: 'A-1',
        toTaskId: 'B-2',
        origin: 'tracker',
        relationship: 'relates',
      },
    ]);
  });

  it('merges planner and tracker links by id', () => {
    expect(
      mergePlannerAndTrackerTaskLinks(
        [{ id: 'p1', fromTaskId: 'c1', toTaskId: 'A-1' }],
        [{ id: 'tracker:1', fromTaskId: 'A-1', toTaskId: 'B-2', origin: 'tracker' }]
      )
    ).toHaveLength(2);
  });
});
