import { describe, expect, it } from 'vitest';

import { planPatchPreviewSegmentHtmlAnchorId } from '@/features/swimlane/utils/planPatchPreviewFocus';

import { buildPlanPatchSegmentArrowLinks } from './planPatchSegmentArrowHelpers';

describe('buildPlanPatchSegmentArrowLinks', () => {
  it('links consecutive ghost segments for an add-with-segments preview', () => {
    expect(
      buildPlanPatchSegmentArrowLinks([
        {
          assigneeId: 'dev-a',
          remove: false,
          segments: [
            { duration: 1, startDay: 0, startPart: 0 },
            { duration: 1, startDay: 1, startPart: 0 },
          ],
          taskId: 'RND-1',
        },
      ])
    ).toEqual([
      {
        endElement: planPatchPreviewSegmentHtmlAnchorId('RND-1', 1),
        id: 'plan-patch-segment-RND-1-0-1',
        startElement: planPatchPreviewSegmentHtmlAnchorId('RND-1', 0),
        taskId: 'RND-1',
      },
    ]);
  });

  it('skips removals, single bars, and other assignees when clipped', () => {
    expect(
      buildPlanPatchSegmentArrowLinks(
        [
          {
            assigneeId: 'dev-a',
            remove: true,
            segments: [
              { duration: 1, startDay: 0, startPart: 0 },
              { duration: 1, startDay: 1, startPart: 0 },
            ],
            taskId: 'gone',
          },
          {
            assigneeId: 'dev-a',
            remove: false,
            segments: [{ duration: 2, startDay: 0, startPart: 0 }],
            taskId: 'single',
          },
          {
            assigneeId: 'dev-b',
            remove: false,
            segments: [
              { duration: 1, startDay: 0, startPart: 0 },
              { duration: 1, startDay: 1, startPart: 0 },
            ],
            taskId: 'other',
          },
        ],
        { assigneeId: 'dev-a' }
      )
    ).toEqual([]);
  });
});
