import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyOperator,
  EmbeddedTestingOnlyRuleForm,
} from '../types';
import type { EmbeddedRulesFieldRow } from './TrackerEmbeddedTestingRulesPanel';

import {
  normalizeRuleForFieldRow,
  toStoredFieldAccessor,
} from '../embeddedTestingRuleFieldHelpers';

type Translate = (key: string) => string;

export function addEmbeddedTestingRule(
  prev: EmbeddedTestingOnlyRuleForm[]
): EmbeddedTestingOnlyRuleForm[] {
  return [...prev, { fieldId: '', operator: 'eq', value: '' }];
}

function updateEmbeddedTestingRule(
  rules: EmbeddedTestingOnlyRuleForm[],
  idx: number,
  update: (rule: EmbeddedTestingOnlyRuleForm) => EmbeddedTestingOnlyRuleForm
): EmbeddedTestingOnlyRuleForm[] {
  return rules.map((rule, i) => (i === idx ? update(rule) : rule));
}

export function setJoinAt(
  joins: EmbeddedTestingOnlyJoin[],
  idx: number,
  value: EmbeddedTestingOnlyJoin
): EmbeddedTestingOnlyJoin[] {
  const next = [...joins];
  next[idx] = value;
  return next;
}

export function moveRule(
  rules: EmbeddedTestingOnlyRuleForm[],
  idx: number,
  direction: -1 | 1
): EmbeddedTestingOnlyRuleForm[] {
  const next = [...rules];
  [next[idx], next[idx + direction]] = [next[idx + direction]!, next[idx]!];
  return next;
}

export function removeRuleAt(
  rules: EmbeddedTestingOnlyRuleForm[],
  idx: number
): EmbeddedTestingOnlyRuleForm[] {
  return rules.filter((_, i) => i !== idx);
}

export function removeJoinForRule(
  joins: EmbeddedTestingOnlyJoin[],
  rulesLength: number,
  idx: number
): EmbeddedTestingOnlyJoin[] {
  if (rulesLength <= 1) {
    return [];
  }
  if (idx === 0) {
    return joins.slice(1);
  }
  if (idx === rulesLength - 1) {
    return joins.slice(0, -1);
  }
  return [...joins.slice(0, idx - 1), 'and', ...joins.slice(idx + 1)];
}

function normalizedOperator(value: EmbeddedTestingOnlyOperator): EmbeddedTestingOnlyOperator {
  if (value === 'eq' || value === 'gt' || value === 'lt' || value === 'gte' || value === 'lte') {
    return value;
  }
  return 'eq';
}

export function updateRuleFieldAt(
  idx: number,
  fieldRows: EmbeddedRulesFieldRow[],
  value: string,
  t: Translate
): (rules: EmbeddedTestingOnlyRuleForm[]) => EmbeddedTestingOnlyRuleForm[] {
  return (rules) =>
    updateEmbeddedTestingRule(rules, idx, (rule) =>
      normalizeRuleForFieldRow(
        fieldRows.find((field) => field.id === value),
        {
          ...rule,
          fieldId: toStoredFieldAccessor(fieldRows, value),
        },
        t
      )
    );
}

export function updateRuleOperatorAt(
  idx: number,
  field: EmbeddedRulesFieldRow | undefined,
  value: EmbeddedTestingOnlyOperator,
  t: Translate
): (rules: EmbeddedTestingOnlyRuleForm[]) => EmbeddedTestingOnlyRuleForm[] {
  return (rules) =>
    updateEmbeddedTestingRule(rules, idx, (rule) =>
      normalizeRuleForFieldRow(
        field,
        {
          ...rule,
          operator: normalizedOperator(value),
        },
        t
      )
    );
}

export function updateRuleValueAt(
  idx: number,
  value: string
): (rules: EmbeddedTestingOnlyRuleForm[]) => EmbeddedTestingOnlyRuleForm[] {
  return (rules) => updateEmbeddedTestingRule(rules, idx, (rule) => ({ ...rule, value }));
}
