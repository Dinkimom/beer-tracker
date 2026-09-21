/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { buildAssigneePickerAvailabilityLines } from './buildAssigneePickerAvailabilityLines';

describe('buildAssigneePickerAvailabilityLines', () => {
  it('returns an empty map when availability is missing', () => {
    expect(
      buildAssigneePickerAvailabilityLines({
        developers: [{ id: 'd1', name: 'Ann', role: 'developer' }],
        sprintStartDate: new Date('2026-01-01'),
      })
    ).toEqual(new Map());
  });
});
