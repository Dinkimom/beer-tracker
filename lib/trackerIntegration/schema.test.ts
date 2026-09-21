import { describe, expect, it } from 'vitest';

import {
  mergeOrganizationSettingsTrackerIntegration,
  parseTrackerIntegrationStored,
  TrackerIntegrationPutBodySchema,
} from './schema';

describe('mergeOrganizationSettingsTrackerIntegration', () => {
  it('merges trackerIntegration without removing sync', () => {
    const next = mergeOrganizationSettingsTrackerIntegration(
      { sync: { enabled: true, intervalMinutes: 5 }, other: 1 },
      {
        configRevision: 2,
        platform: {
          source: 'field',
          valueMap: [{ trackerValue: 'x', platform: 'QA' }],
        },
      }
    );
    expect(next.sync).toEqual({ enabled: true, intervalMinutes: 5 });
    expect(next.other).toBe(1);
    expect(next.trackerIntegration).toEqual({
      configRevision: 2,
      platform: {
        source: 'field',
        valueMap: [{ trackerValue: 'x', platform: 'QA' }],
      },
    });
  });
});

describe('TrackerIntegrationPutBodySchema', () => {
  it('accepts empty object', () => {
    const r = TrackerIntegrationPutBodySchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('rejects unknown keys', () => {
    const r = TrackerIntegrationPutBodySchema.safeParse({ unknown: 1 });
    expect(r.success).toBe(false);
  });

  it('accepts releaseReadiness', () => {
    const r = TrackerIntegrationPutBodySchema.safeParse({
      releaseReadiness: {
        mergeRequestFieldId: 'mrUrl',
        readyStatusKey: 'readyForDeploy',
        releasesTabVisible: true,
      },
    });
    expect(r.success).toBe(true);
  });
});

describe('parseTrackerIntegrationStored', () => {
  it('returns null for invalid', () => {
    expect(parseTrackerIntegrationStored(null)).toBeNull();
    expect(parseTrackerIntegrationStored({})).toBeNull();
  });

  it('parses minimal stored', () => {
    const v = parseTrackerIntegrationStored({ configRevision: 0 });
    expect(v).toEqual({ configRevision: 0 });
  });

  it('accepts status override with only visualToken', () => {
    const v = parseTrackerIntegrationStored({
      configRevision: 1,
      statuses: {
        overridesByStatusKey: {
          closed: { visualToken: 'done' },
        },
      },
    });
    expect(v?.statuses?.overridesByStatusKey?.closed).toEqual({ visualToken: 'done' });
  });
});
