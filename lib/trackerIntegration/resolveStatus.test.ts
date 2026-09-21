import type { TrackerIntegrationStored } from './schema';

import { describe, expect, it } from 'vitest';

import {
  resolveEffectiveStatusCategory,
  resolveStatusCategoryFromIntegration,
} from './resolveStatus';

describe('resolveStatusCategoryFromIntegration', () => {
  it('uses explicit category on override', () => {
    const statuses: TrackerIntegrationStored['statuses'] = {
      overridesByStatusKey: {
        closed: { category: 'paused' },
      },
    };
    expect(resolveStatusCategoryFromIntegration('closed', 'done', statuses)).toBe('paused');
  });

  it('falls through to defaults when override has only visualToken', () => {
    const statuses: TrackerIntegrationStored['statuses'] = {
      defaultsByTrackerStatusType: { done: 'done' },
      overridesByStatusKey: {
        closed: { visualToken: 'closed' },
      },
    };
    expect(resolveStatusCategoryFromIntegration('closed', 'done', statuses)).toBe('done');
  });

  it('returns undefined when override exists but has no category and no default for type', () => {
    const statuses: TrackerIntegrationStored['statuses'] = {
      overridesByStatusKey: {
        weird: { visualToken: 'closed' },
      },
    };
    expect(resolveStatusCategoryFromIntegration('weird', 'unknownType', statuses)).toBeUndefined();
  });
});

describe('resolveEffectiveStatusCategory', () => {
  it('falls back to mapStatus(statusKey)', () => {
    const statuses: TrackerIntegrationStored['statuses'] = {
      overridesByStatusKey: {
        custom: { visualToken: 'closed' },
      },
    };
    expect(resolveEffectiveStatusCategory('closed', 'irrelevant', statuses)).toBe('done');
  });
});
