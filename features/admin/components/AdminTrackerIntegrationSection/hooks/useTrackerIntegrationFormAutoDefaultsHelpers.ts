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
  type EmbeddedTestingRuleFieldMapping,
  rebindEmbeddedTestingRuleFieldId,
  storedAccessorForMappedFieldId,
} from '../embeddedTestingRuleFieldHelpers';
import { resolveFieldIdByAlias } from '../trackerIntegrationFormModel';

export function shouldSkipEmbeddedTestingAutoDefaults(
  snap: { hadEmbeddedTestingOnlyExtraRules: boolean } | null,
  testingFlowMode: 'embedded' | 'standalone',
  fieldRowsLength: number
): boolean {
  if (snap === null || testingFlowMode !== 'embedded') {
    return true;
  }
  return fieldRowsLength === 0;
}

function resolveMappedStoredFieldId(
  fieldRows: TrackerIntegrationFieldRow[],
  mappedFieldId: string,
  alias: string
): string {
  const fromMapping = storedAccessorForMappedFieldId(fieldRows, mappedFieldId);
  if (fromMapping) {
    return fromMapping;
  }
  if (!alias) {
    return '';
  }
  return storedAccessorForMappedFieldId(fieldRows, resolveFieldIdByAlias(fieldRows, alias));
}

function desiredRulesFromMapping(
  fieldRows: TrackerIntegrationFieldRow[],
  platformValueMap: PlatformValueMapFormRow[],
  platformFieldValues: string[],
  mapping: EmbeddedTestingRuleFieldMapping
): EmbeddedTestingOnlyRuleForm[] {
  const testPointsFieldId = resolveMappedStoredFieldId(
    fieldRows,
    mapping.qaEstimateFieldId,
    'testPoints'
  );
  const functionalTeamFieldId =
    resolveMappedStoredFieldId(fieldRows, mapping.platformFieldId, '') ||
    storedAccessorForMappedFieldId(fieldRows, findFunctionalTeamFieldId(fieldRows));
  const qaEnumValue = pickQaTrackerValueForConditions(platformValueMap, platformFieldValues);
  return buildEmbeddedTestingOnlyAutoExtraRules({
    functionalTeamFieldId,
    qaEnumValue,
    testPointsFieldId,
  });
}

function rebindRulesToMapping(
  rules: EmbeddedTestingOnlyRuleForm[],
  fieldRows: TrackerIntegrationFieldRow[],
  mapping: EmbeddedTestingRuleFieldMapping
): EmbeddedTestingOnlyRuleForm[] {
  return rules.map((rule) => ({
    ...rule,
    fieldId: rebindEmbeddedTestingRuleFieldId(rule.fieldId, fieldRows, mapping),
  }));
}

export function buildEmbeddedTestingAutoDefaultsUpdate(
  fieldRows: TrackerIntegrationFieldRow[],
  platformValueMap: PlatformValueMapFormRow[],
  platformFieldValues: string[],
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[],
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[],
  mapping: EmbeddedTestingRuleFieldMapping,
  hadSavedRules: boolean
): {
  desiredJoins: EmbeddedTestingOnlyJoin[];
  desiredRules: EmbeddedTestingOnlyRuleForm[];
  shouldApply: boolean;
} | null {
  if (embeddedTestingOnlyRules.length === 0) {
    if (hadSavedRules) {
      return null;
    }
    const desiredRules = desiredRulesFromMapping(
      fieldRows,
      platformValueMap,
      platformFieldValues,
      mapping
    );
    if (desiredRules.length === 0) {
      return null;
    }
    return {
      desiredJoins: embeddedTestingOnlyJoinsForRuleCount(desiredRules.length),
      desiredRules,
      shouldApply: true,
    };
  }

  const desiredRules = rebindRulesToMapping(embeddedTestingOnlyRules, fieldRows, mapping);
  if (JSON.stringify(desiredRules) === JSON.stringify(embeddedTestingOnlyRules)) {
    return null;
  }
  return {
    desiredJoins: embeddedTestingOnlyJoins,
    desiredRules,
    shouldApply: true,
  };
}

export function readEmbeddedTestingSnapshot(
  ref: MutableRefObject<{ hadEmbeddedTestingOnlyExtraRules: boolean } | null>
): { hadEmbeddedTestingOnlyExtraRules: boolean } | null {
  return ref.current;
}
