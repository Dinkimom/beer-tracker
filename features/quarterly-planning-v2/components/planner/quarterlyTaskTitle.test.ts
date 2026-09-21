import { describe, expect, it } from 'vitest';

import { formatQuarterlyTaskTitleLabel, getQuarterlyTaskTitleParts } from './quarterlyTaskTitle';

describe('getQuarterlyTaskTitleParts', () => {
  it('splits key and title', () => {
    expect(getQuarterlyTaskTitleParts('NW-123', 'Fix bug', 'Untitled')).toEqual({
      key: 'NW-123',
      linkKey: 'NW-123',
      title: 'Fix bug',
      plainText: null,
    });
  });

  it('returns link key only when title equals key', () => {
    expect(getQuarterlyTaskTitleParts('NW-1', '', 'Untitled')).toEqual({
      key: 'NW-1',
      linkKey: 'NW-1',
      title: null,
      plainText: null,
    });
  });

  it('returns plain text when key is empty', () => {
    expect(getQuarterlyTaskTitleParts('', 'Only name', 'Untitled')).toEqual({
      key: '',
      linkKey: null,
      title: null,
      plainText: 'Only name',
    });
  });
});

describe('formatQuarterlyTaskTitleLabel', () => {
  it('joins key and name with dash', () => {
    expect(formatQuarterlyTaskTitleLabel('NW-123', 'Fix bug', 'Untitled')).toBe('NW-123 - Fix bug');
  });

  it('shows only key when title is missing or equals key', () => {
    expect(formatQuarterlyTaskTitleLabel('NW-1', '', 'Untitled')).toBe('NW-1');
    expect(formatQuarterlyTaskTitleLabel('NW-6536', 'NW-6536', 'Untitled')).toBe('NW-6536');
  });

  it('returns name only without key', () => {
    expect(formatQuarterlyTaskTitleLabel('', 'Only name', 'Untitled')).toBe('Only name');
  });
});
