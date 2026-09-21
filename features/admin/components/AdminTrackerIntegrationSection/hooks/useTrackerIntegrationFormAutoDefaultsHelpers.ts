import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyRuleForm,
  PlatformValueMapFormRow,
} from '../types';
import type { TrackerIntegrationFieldRow } from './useTrackerIntegrationFormState';
import type { MutableRefObject } from 'react';

import {
  buildEmbeddedTestingOnlyAutoExtraRules,
  embeddedTestingOnlyJoinsForRuleCount,
  findFunctionalTeamFieldId,
  pickQaTrackerValueForConditions,
} from '@/lib/trackerIntegration/smartIntegrationDefaults';

import {
  embeddedAutoRulesMatchDesiredPrefix,
  resolveFieldIdByAlias,
} from '../trackerIntegrationFormModel';

export function shouldSkipEmbeddedTestingAutoDefaults(
  snap: { hadEmbeddedTestingOnlyExtraRules: boolean } | null,
  testingFlowMode: 'embedded' | 'standalone',
  fieldRowsLength: number
): boolean {
  if (snap === null || snap.hadEmbeddedTestingOnlyExtraRules) {
    return true;
  }
  if (testingFlowMode !== 'embedded') {
    return true;
  }
  return fieldRowsLength === 0;
}

export function buildEmbeddedTestingAutoDefaultsUpdate(
  fieldRows: TrackerIntegrationFieldRow[],
  platformValueMap: PlatformValueMapFormRow[],
  platformFieldValues: string[],
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[],
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[]
): {
  desiredJoins: EmbeddedTestingOnlyJoin[];
  desiredRules: EmbeddedTestingOnlyRuleForm[];
  shouldApply: boolean;
} | null {
  const tpId = resolveFieldIdByAlias(fieldRows, 'testPoints');
  const ftId = findFunctionalTeamFieldId(fieldRows);
  const qaVal = pickQaTrackerValueForConditions(platformValueMap, platformFieldValues);
  const desiredRules = buildEmbeddedTestingOnlyAutoExtraRules({
    functionalTeamFieldId: ftId,
    qaEnumValue: qaVal,
    testPointsFieldId: tpId,
  });
  if (desiredRules.length === 0) {
    return null;
  }
  if (!embeddedAutoRulesMatchDesiredPrefix(embeddedTestingOnlyRules, desiredRules)) {
    return null;
  }
  const desiredJoins = embeddedTestingOnlyJoinsForRuleCount(desiredRules.length);
  const rulesSame =
    JSON.stringify(embeddedTestingOnlyRules) === JSON.stringify(desiredRules);
  const joinsSame =
    JSON.stringify(embeddedTestingOnlyJoins) === JSON.stringify(desiredJoins);
  if (rulesSame && joinsSame) {
    return null;
  }
  return { desiredJoins, desiredRules, shouldApply: true };
}

export function readEmbeddedTestingSnapshot(
  ref: MutableRefObject<{ hadEmbeddedTestingOnlyExtraRules: boolean } | null>
): { hadEmbeddedTestingOnlyExtraRules: boolean } | null {
  return ref.current;
}
