'use client';

import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyOperator,
  EmbeddedTestingOnlyRuleForm,
} from '../types';
import type { EmbeddedRulesFieldRow } from './TrackerEmbeddedTestingRulesPanel';
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '@/components/Button';
import { CustomSelect, type CustomSelectOption } from '@/components/CustomSelect';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import {
  fieldRowIsList,
  findFieldRowByStoredAccessor,
  operatorOptionsForFieldRow,
  toUiFieldValueFromStoredAccessor,
} from '../embeddedTestingRuleFieldHelpers';

import {
  moveRule,
  removeJoinForRule,
  removeRuleAt,
  setJoinAt,
  updateRuleFieldAt,
  updateRuleOperatorAt,
} from './trackerEmbeddedTestingRuleRowHelpers';
import { TrackerEmbeddedTestingRuleValueField } from './TrackerEmbeddedTestingRuleValueField';

const OPERATOR_SYMBOL: Record<EmbeddedTestingOnlyOperator, string> = {
  eq: '=',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
};

interface TrackerEmbeddedTestingRuleRowProps {
  allFieldSelectOptions: CustomSelectOption<string>[];
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[];
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[];
  fieldClass: string;
  fieldRows: EmbeddedRulesFieldRow[];
  idx: number;
  setEmbeddedTestingOnlyJoins: Dispatch<SetStateAction<EmbeddedTestingOnlyJoin[]>>;
  setEmbeddedTestingOnlyRules: Dispatch<SetStateAction<EmbeddedTestingOnlyRuleForm[]>>;
}

function joinButtonClass(active: boolean): string {
  return active
    ? 'rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
    : 'rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200';
}

export function TrackerEmbeddedTestingRuleRow({
  allFieldSelectOptions,
  embeddedTestingOnlyJoins,
  embeddedTestingOnlyRules,
  fieldClass,
  fieldRows,
  idx,
  setEmbeddedTestingOnlyJoins,
  setEmbeddedTestingOnlyRules,
}: TrackerEmbeddedTestingRuleRowProps) {
  const { t } = useI18n();
  const field = findFieldRowByStoredAccessor(fieldRows, ruleFieldId(embeddedTestingOnlyRules, idx));
  const rule = embeddedTestingOnlyRules[idx];
  if (!rule) {
    return null;
  }
  const operatorOptions = operatorOptionsForFieldRow(field, t);
  const join = embeddedTestingOnlyJoins[idx - 1] ?? 'and';

  return (
    <div className="space-y-2">
      {idx > 0 ? (
        <div className="flex justify-center">
          <div
            aria-label={t('admin.plannerIntegration.embeddedRules.joinTitle')}
            className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800"
            role="group"
          >
            <button
              className={joinButtonClass(join !== 'or')}
              type="button"
              onClick={() =>
                setEmbeddedTestingOnlyJoins((prev) => setJoinAt(prev, idx - 1, 'and'))
              }
            >
              {t('admin.plannerIntegration.embeddedRules.joinAnd')}
            </button>
            <button
              className={joinButtonClass(join === 'or')}
              type="button"
              onClick={() =>
                setEmbeddedTestingOnlyJoins((prev) => setJoinAt(prev, idx - 1, 'or'))
              }
            >
              {t('admin.plannerIntegration.embeddedRules.joinOr')}
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/80 bg-white p-2 dark:border-gray-700 dark:bg-gray-900/40">
        <span className="w-5 shrink-0 text-center text-xs font-medium tabular-nums text-gray-400">
          {idx + 1}
        </span>
        <div className="min-w-[12rem] flex-1">
          <CustomSelect
            className="w-full"
            options={allFieldSelectOptions}
            searchPlaceholder={t('admin.plannerIntegration.embeddedRules.fieldPlaceholder')}
            searchable
            title={t('admin.plannerIntegration.embeddedRules.fieldTitle')}
            value={toUiFieldValueFromStoredAccessor(fieldRows, rule.fieldId)}
            onChange={(value) =>
              setEmbeddedTestingOnlyRules(updateRuleFieldAt(idx, fieldRows, value, t))
            }
          />
        </div>
        <CustomSelect
          className="w-[4.25rem] shrink-0"
          menuFitContent
          options={operatorOptions}
          renderOption={(option) => (
            <span className="flex items-center gap-2">
              <span className="w-4 text-center font-semibold tabular-nums">
                {OPERATOR_SYMBOL[option.value]}
              </span>
              <span>{option.label}</span>
            </span>
          )}
          renderTriggerValue={() => (
            <span className="font-semibold tabular-nums">
              {OPERATOR_SYMBOL[rule.operator]}
            </span>
          )}
          title={t('admin.plannerIntegration.embeddedRules.comparisonTitle')}
          value={rule.operator}
          onChange={(value) =>
            setEmbeddedTestingOnlyRules(
              updateRuleOperatorAt(idx, field, value as EmbeddedTestingOnlyOperator, t)
            )
          }
        />
        <div className="w-36 shrink-0">
          <TrackerEmbeddedTestingRuleValueField
            field={field}
            fieldClass={fieldClass}
            idx={idx}
            listField={fieldRowIsList(field)}
            ruleValue={rule.value}
            setEmbeddedTestingOnlyRules={setEmbeddedTestingOnlyRules}
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center">
          <Button
            className="!h-9 !w-9 !px-0"
            disabled={idx === 0}
            title={t('admin.plannerIntegration.embeddedRules.moveUpTitle')}
            type="button"
            variant="ghost"
            onClick={() => {
              if (idx === 0) return;
              setEmbeddedTestingOnlyRules((prev) => moveRule(prev, idx, -1));
            }}
          >
            <Icon className="h-4 w-4" name="chevron-up" />
          </Button>
          <Button
            className="!h-9 !w-9 !px-0"
            disabled={idx >= embeddedTestingOnlyRules.length - 1}
            title={t('admin.plannerIntegration.embeddedRules.moveDownTitle')}
            type="button"
            variant="ghost"
            onClick={() => {
              if (idx >= embeddedTestingOnlyRules.length - 1) return;
              setEmbeddedTestingOnlyRules((prev) => moveRule(prev, idx, 1));
            }}
          >
            <Icon className="h-4 w-4" name="chevron-down" />
          </Button>
          <Button
            className="!h-9 !w-9 !px-0"
            title={t('admin.plannerIntegration.embeddedRules.delete')}
            type="button"
            variant="ghost"
            onClick={() => {
              setEmbeddedTestingOnlyRules((prevRules) => removeRuleAt(prevRules, idx));
              setEmbeddedTestingOnlyJoins((prevJoins) =>
                removeJoinForRule(prevJoins, embeddedTestingOnlyRules.length, idx)
              );
            }}
          >
            <Icon className="h-4 w-4" name="trash" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ruleFieldId(rules: EmbeddedTestingOnlyRuleForm[], idx: number): string {
  return rules[idx]?.fieldId ?? '';
}
