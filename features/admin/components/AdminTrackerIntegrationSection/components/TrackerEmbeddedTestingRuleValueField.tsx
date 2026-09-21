'use client';

import type { EmbeddedTestingOnlyRuleForm } from '../types';
import type { EmbeddedRulesFieldRow } from './TrackerEmbeddedTestingRulesPanel';
import type { Dispatch, SetStateAction } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';

import {
  fieldRowIsNumeric,
} from '../embeddedTestingRuleFieldHelpers';

import { updateRuleValueAt } from './trackerEmbeddedTestingRuleRowHelpers';

interface TrackerEmbeddedTestingRuleValueFieldProps {
  field: EmbeddedRulesFieldRow | undefined;
  fieldClass: string;
  idx: number;
  listField: boolean;
  ruleValue: string;
  setEmbeddedTestingOnlyRules: Dispatch<SetStateAction<EmbeddedTestingOnlyRuleForm[]>>;
}

export function TrackerEmbeddedTestingRuleValueField({
  field,
  fieldClass,
  idx,
  listField,
  ruleValue,
  setEmbeddedTestingOnlyRules,
}: TrackerEmbeddedTestingRuleValueFieldProps) {
  const { t } = useI18n();

  if (listField && field?.options?.length) {
    return (
      <CustomSelect
        className="w-full"
        options={[
          {
            label: t('admin.plannerIntegration.embeddedRules.valueEmptyOption'),
            value: '',
          },
          ...field.options.map((opt) => ({
            label: opt,
            value: opt,
          })),
        ]}
        searchPlaceholder={t('admin.plannerIntegration.embeddedRules.valueSearch')}
        searchable
        title={t('admin.plannerIntegration.embeddedRules.valueTitle')}
        value={ruleValue}
        onChange={(v) => setEmbeddedTestingOnlyRules(updateRuleValueAt(idx, v))}
      />
    );
  }

  return (
    <input
      className={fieldClass}
      inputMode={fieldRowIsNumeric(field) ? 'decimal' : 'text'}
      placeholder={
        fieldRowIsNumeric(field)
          ? t('admin.plannerIntegration.embeddedRules.valueNumber')
          : t('admin.plannerIntegration.embeddedRules.valueText')
      }
      type="text"
      value={ruleValue}
      onChange={(e) => setEmbeddedTestingOnlyRules(updateRuleValueAt(idx, e.target.value))}
    />
  );
}
