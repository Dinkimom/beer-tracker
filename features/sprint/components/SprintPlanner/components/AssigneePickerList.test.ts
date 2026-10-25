/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  assigneePickerGroupIsSuitable,
  getAssigneePickerPlatformOrder,
} from './AssigneePickerList';

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

describe('assigneePickerGroupIsSuitable', () => {
  it('marks the matching platform when the task platform is set', () => {
    expect(assigneePickerGroupIsSuitable('Back', 'Back')).toBe(true);
    expect(assigneePickerGroupIsSuitable('Web', 'Back')).toBe(false);
    expect(assigneePickerGroupIsSuitable('QA', 'QA')).toBe(true);
    expect(assigneePickerGroupIsSuitable('Web', 'Web')).toBe(true);
    expect(assigneePickerGroupIsSuitable('Back', 'DevOps')).toBe(true);
    expect(assigneePickerGroupIsSuitable('Web', 'DevOps')).toBe(true);
    expect(assigneePickerGroupIsSuitable('QA', 'DevOps')).toBe(false);
  });

  it('does not mark a group when the task has no platform', () => {
    expect(assigneePickerGroupIsSuitable('Back', undefined)).toBe(false);
    expect(assigneePickerGroupIsSuitable('Back', '')).toBe(false);
  });
});
