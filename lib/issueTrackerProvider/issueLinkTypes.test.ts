import { describe, expect, it } from 'vitest';

import {
  isIssueLinkCreateRelationship,
  mapTrackerRelationshipLabelToCanonical,
  yandexRelationshipForCreate,
} from './issueLinkTypes';

describe('issueLinkTypes', () => {
  it('maps Yandex relationship labels to canonical BT types', () => {
    expect(mapTrackerRelationshipLabelToCanonical('relates')).toBe('relates');
    expect(mapTrackerRelationshipLabelToCanonical('relates to')).toBe('relates');
    expect(mapTrackerRelationshipLabelToCanonical('is dependent by')).toBe('blocks');
    expect(mapTrackerRelationshipLabelToCanonical('depends on')).toBe('blocked_by');
    expect(mapTrackerRelationshipLabelToCanonical('duplicates')).toBe('duplicates');
    expect(mapTrackerRelationshipLabelToCanonical('is duplicated by')).toBe('duplicated_by');
  });

  it('filters hierarchy relationships', () => {
    expect(mapTrackerRelationshipLabelToCanonical('is subtask for')).toBeNull();
    expect(mapTrackerRelationshipLabelToCanonical('is parent task for')).toBeNull();
    expect(mapTrackerRelationshipLabelToCanonical('is epic of')).toBeNull();
    expect(mapTrackerRelationshipLabelToCanonical('has epic')).toBeNull();
  });

  it('maps create relationships to Yandex POST values', () => {
    expect(yandexRelationshipForCreate('relates')).toBe('relates');
    expect(yandexRelationshipForCreate('blocks')).toBe('is dependent by');
    expect(yandexRelationshipForCreate('blocked_by')).toBe('depends on');
    expect(yandexRelationshipForCreate('duplicates')).toBe('duplicates');
  });

  it('validates create relationship union', () => {
    expect(isIssueLinkCreateRelationship('relates')).toBe(true);
    expect(isIssueLinkCreateRelationship('duplicated_by')).toBe(false);
  });
});
