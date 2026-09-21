import type { TrackerIssue } from '@/types/tracker';

import { readNumericEstimateFromIssue, readStringTokenFromIssue, readStringTokensFromIssue } from './issueFieldUtils';

type EmbeddedTestingOnlyOperator = 'eq' | 'gt' | 'gte' | 'lt' | 'lte';

interface EmbeddedTestingOnlyRule {
  fieldId: string;
  operator: EmbeddedTestingOnlyOperator;
  value: string;
}

function compareNumeric(op: EmbeddedTestingOnlyOperator, lhs: number, rhs: number): boolean {
  switch (op) {
    case 'eq':
      return lhs === rhs;
    case 'gt':
      return lhs > rhs;
    case 'gte':
      return lhs >= rhs;
    case 'lt':
      return lhs < rhs;
    case 'lte':
      return lhs <= rhs;
    default:
      return false;
  }
}

function evalEqRule(
  issue: TrackerIssue,
  rule: EmbeddedTestingOnlyRule,
  lhsNum: number | undefined,
  lhsStr: string,
  rawVal: string
): boolean {
  if (rawVal === '') {
    return false;
  }
  const rhsNum = Number(rawVal);
  if (lhsNum !== undefined && Number.isFinite(rhsNum)) {
    return lhsNum === rhsNum;
  }
  const rawNeedle = rawVal.toLowerCase();
  const allTokens = readStringTokensFromIssue(issue, rule.fieldId).map((s) => s.toLowerCase());
  if (allTokens.includes(rawNeedle)) {
    return true;
  }
  return lhsStr.trim().toLowerCase() === rawNeedle;
}

function evalOneRule(issue: TrackerIssue, rule: EmbeddedTestingOnlyRule): boolean {
  const op = rule.operator;
  const rawVal = rule.value.trim();
  const lhsNum = readNumericEstimateFromIssue(issue, rule.fieldId);
  const lhsStr = readStringTokenFromIssue(issue, rule.fieldId);

  if (op === 'eq') {
    return evalEqRule(issue, rule, lhsNum, lhsStr, rawVal);
  }

  const rhsNum = Number(rawVal);
  if (lhsNum === undefined || !Number.isFinite(rhsNum)) {
    return false;
  }
  return compareNumeric(op, lhsNum, rhsNum);
}

/** Дополняет связки до длины rules.length - 1 (пропуски = and). */
export function padEmbeddedTestingOnlyJoins(
  rulesLen: number,
  joins: Array<'and' | 'or'> | undefined
): Array<'and' | 'or'> {
  const need = Math.max(0, rulesLen - 1);
  const out: Array<'and' | 'or'> = [];
  for (let i = 0; i < need; i++) {
    out.push(joins?.[i] === 'or' ? 'or' : 'and');
  }
  return out;
}

/**
 * Цепочка правил: rule[0] join[0] rule[1] join[1] rule[2] ...
 * joins.length === rules.length - 1
 */
export function evaluateEmbeddedTestingOnlyPredicate(
  issue: TrackerIssue,
  rules: EmbeddedTestingOnlyRule[],
  joins: Array<'and' | 'or'>
): boolean {
  if (rules.length === 0) {
    return false;
  }
  let acc = evalOneRule(issue, rules[0]);
  for (let i = 1; i < rules.length; i++) {
    const next = evalOneRule(issue, rules[i]);
    const j = joins[i - 1] ?? 'and';
    acc = j === 'or' ? acc || next : acc && next;
  }
  return acc;
}

