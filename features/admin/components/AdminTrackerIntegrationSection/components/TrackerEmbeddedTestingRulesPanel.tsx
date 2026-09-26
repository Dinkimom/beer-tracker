'use client';

import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyRuleForm,
} from '../types';
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '@/components/Button';
import { type CustomSelectOption } from '@/components/CustomSelect';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { TrackerEmbeddedTestingRuleRow } from './TrackerEmbeddedTestingRuleRow';
import { addEmbeddedTestingRule } from './trackerEmbeddedTestingRuleRowHelpers';

export interface EmbeddedRulesFieldRow {
  display?: string;
  id: string;
  key?: string;
  name?: string;
  options?: string[];
  schemaType?: string;
}

interface TrackerEmbeddedTestingRulesPanelProps {
  allFieldSelectOptions: CustomSelectOption<string>[];
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[];
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[];
  fieldClass: string;
  fieldRows: EmbeddedRulesFieldRow[];
  mutedClass: string;
  setEmbeddedTestingOnlyJoins: Dispatch<
    SetStateAction<EmbeddedTestingOnlyJoin[]>
  >;
  setEmbeddedTestingOnlyRules: Dispatch<
    SetStateAction<EmbeddedTestingOnlyRuleForm[]>
  >;
}

export function TrackerEmbeddedTestingRulesPanel({
  allFieldSelectOptions,
  embeddedTestingOnlyJoins,
  embeddedTestingOnlyRules,
  fieldClass,
  fieldRows,
  mutedClass,
  setEmbeddedTestingOnlyJoins,
  setEmbeddedTestingOnlyRules,
}: TrackerEmbeddedTestingRulesPanelProps) {
  const { t } = useI18n();

  return (
    <div className="mt-5 border-t border-gray-200/80 pt-4 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t('admin.plannerIntegration.embeddedRules.title')}
      </h4>
      <p className={`mt-1 text-xs ${mutedClass}`}>
        {t('admin.plannerIntegration.embeddedRules.subtitle')}
      </p>
      <div className="mt-3 space-y-2">
        {embeddedTestingOnlyRules.length === 0 ? (
          <p className={`text-xs ${mutedClass}`}>
            {t('admin.plannerIntegration.embeddedRules.noRulesInList')}
          </p>
        ) : (
          embeddedTestingOnlyRules.map((rule, idx) => (
            <TrackerEmbeddedTestingRuleRow
              key={`${idx}-${rule.fieldId}`}
              allFieldSelectOptions={allFieldSelectOptions}
              embeddedTestingOnlyJoins={embeddedTestingOnlyJoins}
              embeddedTestingOnlyRules={embeddedTestingOnlyRules}
              fieldClass={fieldClass}
              fieldRows={fieldRows}
              idx={idx}
              setEmbeddedTestingOnlyJoins={setEmbeddedTestingOnlyJoins}
              setEmbeddedTestingOnlyRules={setEmbeddedTestingOnlyRules}
            />
          ))
        )}
      </div>
      <Button
        className="mt-3 px-2.5 py-1.5 text-xs"
        type="button"
        variant="outline"
        onClick={() => {
          if (embeddedTestingOnlyRules.length > 0) {
            setEmbeddedTestingOnlyJoins((joins) => [...joins, 'and']);
          }
          setEmbeddedTestingOnlyRules((prev) => addEmbeddedTestingRule(prev));
        }}
      >
        <Icon className="h-3.5 w-3.5" name="plus" />
        {t('admin.plannerIntegration.embeddedRules.addRule')}
      </Button>
    </div>
  );
}
