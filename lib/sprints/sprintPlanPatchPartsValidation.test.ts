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

  it('allows a valid segment split whose envelope matches the sum', () => {
    expect(() =>
      assertPlanPatchOpsFitPartsPerDay(
        [
          {
            assigneeId: 'staff:a',
            duration: 3,
            op: 'upsertPosition',
            segments: [
              { duration: 2, startDay: 0, startPart: 0 },
              { duration: 1, startDay: 1, startPart: 1 },
            ],
            startDay: 0,
            startPart: 0,
            taskId: 'T-1',
          },
        ],
        2
      )
    ).not.toThrow();
  });

  it('rejects segments when duration does not match the sum', () => {
    expect(() =>
      assertPlanPatchOpsFitPartsPerDay(
        [
          {
            assigneeId: 'staff:a',
            duration: 4,
            op: 'upsertPosition',
            segments: [
              { duration: 2, startDay: 0, startPart: 0 },
              { duration: 1, startDay: 1, startPart: 0 },
            ],
            startDay: 0,
            startPart: 0,
            taskId: 'T-1',
          },
        ],
        2
      )
    ).toThrow(/sum of segments/);
  });
});
