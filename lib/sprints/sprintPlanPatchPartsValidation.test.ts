import { describe, expect, it } from 'vitest';

import { assertPlanPatchOpsFitPartsPerDay } from './sprintPlanPatchPartsValidation';

describe('assertPlanPatchOpsFitPartsPerDay', () => {
  it('allows parts within the org grid', () => {
    expect(() =>
      assertPlanPatchOpsFitPartsPerDay(
        [
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 1,
            taskId: 'T-1',
          },
        ],
        2
      )
    ).not.toThrow();
  });

  it('rejects startPart >= partsPerDay', () => {
    expect(() =>
      assertPlanPatchOpsFitPartsPerDay(
        [
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 2,
            taskId: 'T-1',
          },
        ],
        2
      )
    ).toThrow(/partsPerDay=2/);
  });

  it('rejects createNote part out of range', () => {
    expect(() =>
      assertPlanPatchOpsFitPartsPerDay(
        [
          {
            assigneeId: 'staff:a',
            day: 0,
            op: 'createNote',
            part: 3,
            text: 'reserve',
          },
        ],
        2
      )
    ).toThrow(/ops\[0\]\.part/);
  });
});
