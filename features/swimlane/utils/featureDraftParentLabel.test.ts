import { describe, expect, it } from 'vitest';

import {
  buildFeatureDraftRowNamesById,
  humanFeatureDraftParentDisplay,
  resolveFeatureDraftParentLabel,
} from './featureDraftParentLabel';

describe('humanFeatureDraftParentDisplay', () => {
  it('returns the draft title', () => {
    expect(humanFeatureDraftParentDisplay('Пупи', 'feature-draft:1')).toBe('Пупи');
  });

  it('hides a raw feature-draft id', () => {
    expect(humanFeatureDraftParentDisplay('feature-draft:1', 'feature-draft:1')).toBe('');
  });
});

describe('resolveFeatureDraftParentLabel', () => {
  it('keeps a tracker parent display', () => {
    expect(
      resolveFeatureDraftParentLabel({ display: 'Story', id: 's1', key: 'ST-1' })
    ).toBe('Story');
  });

  it('shows the draft title instead of the row id', () => {
    expect(
      resolveFeatureDraftParentLabel({
        display: 'Пупи',
        id: 'feature-draft:1',
        key: 'feature-draft:1',
      })
    ).toBe('Пупи');
  });

  it('looks up the draft title when display is the raw row id', () => {
    expect(
      resolveFeatureDraftParentLabel(
        {
          display: 'feature-draft:1',
          id: 'feature-draft:1',
          key: 'feature-draft:1',
        },
        new Map([['feature-draft:1', 'Пупи']])
      )
    ).toBe('Пупи');
  });

  it('does not fall back to the raw row id', () => {
    expect(
      resolveFeatureDraftParentLabel({
        display: 'feature-draft:1',
        id: 'feature-draft:1',
        key: 'feature-draft:1',
      })
    ).toBe('');
  });
});

describe('buildFeatureDraftRowNamesById', () => {
  it('indexes human draft names', () => {
    expect(
      buildFeatureDraftRowNamesById([
        { id: 'feature-draft:1', name: 'Пупи' },
        { id: 'feature-draft:2', name: 'feature-draft:2' },
        { id: 'ST-1', name: 'Story' },
      ])
    ).toEqual(new Map([['feature-draft:1', 'Пупи']]));
  });
});
