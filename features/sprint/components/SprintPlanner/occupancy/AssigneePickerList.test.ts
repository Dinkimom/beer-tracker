/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { getAssigneePickerPlatformOrder } from './AssigneePickerList';

describe('getAssigneePickerPlatformOrder', () => {
  it('puts the task platform first', () => {
    expect(getAssigneePickerPlatformOrder('qa')).toEqual(['QA', 'Back', 'Web', 'Other']);
    expect(getAssigneePickerPlatformOrder('back')).toEqual(['Back', 'Web', 'QA', 'Other']);
    expect(getAssigneePickerPlatformOrder('web')).toEqual(['Web', 'Back', 'QA', 'Other']);
  });

  it('falls back to Back first when the team is unknown', () => {
    expect(getAssigneePickerPlatformOrder(undefined)).toEqual(['Back', 'Web', 'QA', 'Other']);
  });
});
