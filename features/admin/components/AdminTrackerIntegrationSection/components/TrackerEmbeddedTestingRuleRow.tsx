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

interface TrackerEmbeddedTestingRuleRowProps {
  allFieldSelectOptions: CustomSelectOption<string>[];
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[];
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[];
  fieldClass: string;
  fieldRows: EmbeddedRulesFieldRow[];
  idx: number;
  mutedClass: string;
  rule: EmbeddedTestingOnlyRuleForm;
  setEmbeddedTestingOnlyJoins: Dispatch<SetStateAction<EmbeddedTestingOnlyJoin[]>>;
  setEmbeddedTestingOnlyRules: Dispatch<SetStateAction<EmbeddedTestingOnlyRuleForm[]>>;
}

export function TrackerEmbeddedTestingRuleRow({
  allFieldSelectOptions,
  embeddedTestingOnlyJoins,
  embeddedTestingOnlyRules,
  fieldClass,
  fieldRows,
  idx,
  mutedClass,
  rule,
  setEmbeddedTestingOnlyJoins,
  setEmbeddedTestingOnlyRules,
}: TrackerEmbeddedTestingRuleRowProps) {
  const { t } = useI18n();
  const f = findFieldRowByStoredAccessor(fieldRows, rule.fieldId);
  const opOpts = operatorOptionsForFieldRow(f, t);
  const listField = fieldRowIsList(f);

  return (
    <div className="space-y-2">
      {idx > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs ${mutedClass}`}>
            {t('admin.plannerIntegration.embeddedRules.joinPrev')}
          </span>
          <CustomSelect
            className="min-w-[140px]"
            options={[
              { label: t('admin.plannerIntegration.embeddedRules.logicalAnd'), value: 'and' },
              { label: t('admin.plannerIntegration.embeddedRules.logicalOr'), value: 'or' },
            ]}
            title={t('admin.plannerIntegration.embeddedRules.joinTitle')}
            value={embeddedTestingOnlyJoins[idx - 1] ?? 'and'}
            onChange={(v) =>
              setEmbeddedTestingOnlyJoins((prev) =>
                setJoinAt(prev, idx - 1, v === 'or' ? 'or' : 'and')
              )
            }
          />
        </div>
      ) : null}
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.75fr)_minmax(0,1fr)_auto]">
        <CustomSelect
          className="w-full"
          options={allFieldSelectOptions}
          searchPlaceholder={t('admin.plannerIntegration.embeddedRules.fieldPlaceholder')}
          searchable
          title={t('admin.plannerIntegration.embeddedRules.fieldTitle')}
          value={toUiFieldValueFromStoredAccessor(fieldRows, rule.fieldId)}
          onChange={(v) => setEmbeddedTestingOnlyRules(updateRuleFieldAt(idx, fieldRows, v, t))}
        />
        <CustomSelect
          className="w-full"
          options={opOpts}
          title={t('admin.plannerIntegration.embeddedRules.comparisonTitle')}
          value={rule.operator}
          onChange={(v) =>
            setEmbeddedTestingOnlyRules(
              updateRuleOperatorAt(idx, f, v as EmbeddedTestingOnlyOperator, t)
            )
          }
        />
        <TrackerEmbeddedTestingRuleValueField
          field={f}
          fieldClass={fieldClass}
          idx={idx}
          listField={listField}
          ruleValue={rule.value}
          setEmbeddedTestingOnlyRules={setEmbeddedTestingOnlyRules}
        />
        <div className="flex flex-wrap items-center gap-1">
          <Button
            className="px-2 py-2 text-xs"
            disabled={idx === 0}
            title={t('admin.plannerIntegration.embeddedRules.moveUpTitle')}
            type="button"
            variant="outline"
            onClick={() => {
              if (idx === 0) return;
              setEmbeddedTestingOnlyRules((prev) => moveRule(prev, idx, -1));
            }}
          >
            ↑
          </Button>
          <Button
            className="px-2 py-2 text-xs"
            disabled={idx >= embeddedTestingOnlyRules.length - 1}
            title={t('admin.plannerIntegration.embeddedRules.moveDownTitle')}
            type="button"
            variant="outline"
            onClick={() => {
              if (idx >= embeddedTestingOnlyRules.length - 1) return;
              setEmbeddedTestingOnlyRules((prev) => moveRule(prev, idx, 1));
            }}
          >
            ↓
          </Button>
          <Button
            className="px-2.5 py-2 text-xs"
            type="button"
            variant="outline"
            onClick={() => {
              setEmbeddedTestingOnlyRules((prevRules) => removeRuleAt(prevRules, idx));
              setEmbeddedTestingOnlyJoins((prevJoins) =>
                removeJoinForRule(prevJoins, embeddedTestingOnlyRules.length, idx)
              );
            }}
          >
            {t('admin.plannerIntegration.embeddedRules.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
