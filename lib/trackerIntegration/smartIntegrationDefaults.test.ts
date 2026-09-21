import { describe, expect, it } from 'vitest';

import {
  buildAutoPlatformValueMap,
  buildEmbeddedTestingOnlyAutoExtraRules,
  findFunctionalTeamFieldId,
  matchPlannerPlatformByExactName,
  pickQaTrackerValueForConditions,
} from './smartIntegrationDefaults';

describe('findFunctionalTeamFieldId', () => {
  it('finds by key functionalTeam', () => {
    expect(
      findFunctionalTeamFieldId([
        { id: 'x', key: 'other' },
        { id: 'ft', key: 'functionalTeam' },
      ])
    ).toBe('ft');
  });

  it('finds by Russian title', () => {
    expect(
      findFunctionalTeamFieldId([{ id: 'f', display: 'Функциональная команда', key: 'fc' }])
    ).toBe('f');
  });
});

describe('matchPlannerPlatformByExactName', () => {
  it('matches exact alias', () => {
    expect(matchPlannerPlatformByExactName('QA')).toBe('QA');
    expect(matchPlannerPlatformByExactName('frontend')).toBe('Web');
  });

  it('returns null for partial', () => {
    expect(matchPlannerPlatformByExactName('qa-team')).toBeNull();
  });
});

describe('buildAutoPlatformValueMap', () => {
  it('maps known values only', () => {
    expect(buildAutoPlatformValueMap(['backend', 'unknown', 'QA'])).toEqual([
      { platform: 'Back', trackerValue: 'backend' },
      { platform: 'QA', trackerValue: 'QA' },
    ]);
  });
});

describe('pickQaTrackerValueForConditions', () => {
  it('prefers value map QA row', () => {
    expect(
      pickQaTrackerValueForConditions(
        [
          { platform: 'Web', trackerValue: 'Front' },
          { platform: 'QA', trackerValue: 'Quality' },
        ],
        ['QA', 'Back']
      )
    ).toBe('Quality');
  });

  it('falls back to enum alias match', () => {
    expect(pickQaTrackerValueForConditions([], ['Back', 'тестирование'])).toBe('тестирование');
  });
});

describe('buildEmbeddedTestingOnlyAutoExtraRules', () => {
  it('builds tp gt 0 and functional team eq', () => {
    expect(
      buildEmbeddedTestingOnlyAutoExtraRules({
        functionalTeamFieldId: 'ft1',
        qaEnumValue: 'QA',
        testPointsFieldId: 'tp1',
      })
    ).toEqual([
      { fieldId: 'tp1', operator: 'gt', value: '0' },
      { fieldId: 'ft1', operator: 'eq', value: 'QA' },
    ]);
  });
});
