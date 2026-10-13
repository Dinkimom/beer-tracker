import { describe, expect, it } from 'vitest';

import {
  isGenericRelatesLabel,
  isIssueLinkCreateRelationship,
  mapTrackerRelationshipLabelToCanonical,
  resolveStoredIssueLinkRelationship,
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

  it('keeps a custom Jira phrase and drops hierarchy', () => {
    expect(resolveStoredIssueLinkRelationship('has linked QA task')).toEqual({
      relationship: null,
      relationshipLabel: 'has linked QA task',
    });
    expect(resolveStoredIssueLinkRelationship('  связана с задачей ')).toEqual({
      relationship: null,
      relationshipLabel: 'связана с задачей',
    });
    expect(resolveStoredIssueLinkRelationship('relates to')).toEqual({
      relationship: 'relates',
      relationshipLabel: 'relates to',
    });
    expect(resolveStoredIssueLinkRelationship('is subtask for')).toBeNull();
    expect(resolveStoredIssueLinkRelationship('   ')).toBeNull();
  });

  it('treats relates phrases as the generic link', () => {
    expect(isGenericRelatesLabel('relates to')).toBe(true);
    expect(isGenericRelatesLabel('Связана с задачей')).toBe(true);
    expect(isGenericRelatesLabel('has linked QA task')).toBe(false);
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
