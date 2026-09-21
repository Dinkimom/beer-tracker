'use client';

import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyRuleForm,
} from '../types';
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '@/components/Button';
import { type CustomSelectOption } from '@/components/CustomSelect';
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
  testingOnlyRulesPreview: string;
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
  testingOnlyRulesPreview,
}: TrackerEmbeddedTestingRulesPanelProps) {
  const { t } = useI18n();

  return (
    <div className="mt-5 border-t border-gray-200/80 pt-4 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t('admin.plannerIntegration.embeddedRules.title')}
      </h4>
      <div className="mt-2 space-y-1">
        <p className={`text-xs ${mutedClass}`}>
          {t('admin.plannerIntegration.embeddedRules.subtitle')}
        </p>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          <span className="font-semibold">
            {t('admin.plannerIntegration.embeddedRules.previewPrefix')}
          </span>
          {testingOnlyRulesPreview}
        </p>
      </div>
      <div className="mt-4 rounded-lg border border-gray-200/80 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-950/20">
        <div className="flex items-center justify-between gap-2">
          <Button
            className="px-2.5 py-1.5 text-xs"
            type="button"
            variant="outline"
            onClick={() => {
              setEmbeddedTestingOnlyRules((prev) => {
                if (prev.length > 0) {
                  setEmbeddedTestingOnlyJoins((j) => [...j, 'and']);
                }
                return addEmbeddedTestingRule(prev);
              });
            }}
          >
            {t('admin.plannerIntegration.embeddedRules.addRule')}
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {embeddedTestingOnlyRules.length === 0 ? (
            <p className={`text-xs ${mutedClass}`}>
              {t('admin.plannerIntegration.embeddedRules.noRulesInList')}
            </p>
          ) : (
            embeddedTestingOnlyRules.map((rule, idx) => (
              <TrackerEmbeddedTestingRuleRow
                key={`${idx}-${rule.fieldId}-${rule.operator}`}
                allFieldSelectOptions={allFieldSelectOptions}
                embeddedTestingOnlyJoins={embeddedTestingOnlyJoins}
                embeddedTestingOnlyRules={embeddedTestingOnlyRules}
                fieldClass={fieldClass}
                fieldRows={fieldRows}
                idx={idx}
                mutedClass={mutedClass}
                rule={rule}
                setEmbeddedTestingOnlyJoins={setEmbeddedTestingOnlyJoins}
                setEmbeddedTestingOnlyRules={setEmbeddedTestingOnlyRules}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
