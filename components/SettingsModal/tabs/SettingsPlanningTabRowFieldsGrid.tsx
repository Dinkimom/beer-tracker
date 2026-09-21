'use client';

import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';

import { useI18n } from '@/contexts/LanguageContext';

import { CheckboxOption } from '../components/CheckboxOption';

export function SettingsPlanningTabRowFieldsGrid({
  fields,
  setFields,
}: {
  fields: OccupancyRowFieldsVisibility;
  setFields: (
    v: OccupancyRowFieldsVisibility | ((prev: OccupancyRowFieldsVisibility) => OccupancyRowFieldsVisibility)
  ) => void;
}) {
  const { t } = useI18n();
  const on = (key: keyof OccupancyRowFieldsVisibility) => (checked: boolean) =>
    setFields((prev) => ({ ...prev, [key]: checked }));
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
      {'showAssignee' in fields && (
        <CheckboxOption
          checked={fields.showAssignee}
          label={t('settings.planningTab.rowFieldLabels.assignee')}
          onChange={on('showAssignee')}
        />
      )}
      {'showQa' in fields && (
        <CheckboxOption
          checked={fields.showQa}
          label={t('settings.planningTab.rowFieldLabels.qa')}
          onChange={on('showQa')}
        />
      )}
      <CheckboxOption
        checked={fields.showStoryPoints}
        label={t('settings.planningTab.rowFieldLabels.storyPoints')}
        onChange={on('showStoryPoints')}
      />
      <CheckboxOption
        checked={fields.showTestPoints}
        label={t('settings.planningTab.rowFieldLabels.testPoints')}
        onChange={on('showTestPoints')}
      />
      <CheckboxOption
        checked={fields.showKey}
        label={t('settings.planningTab.rowFieldLabels.issueKey')}
        onChange={on('showKey')}
      />
      <CheckboxOption
        checked={fields.showStatus}
        label={t('settings.planningTab.rowFieldLabels.status')}
        onChange={on('showStatus')}
      />
      {'showSeverity' in fields && (
        <CheckboxOption
          checked={fields.showSeverity}
          label={t('settings.planningTab.rowFieldLabels.severity')}
          onChange={on('showSeverity')}
        />
      )}
      <CheckboxOption
        checked={fields.showType}
        label={t('settings.planningTab.rowFieldLabels.type')}
        onChange={on('showType')}
      />
      <CheckboxOption
        checked={fields.showPriority}
        label={t('settings.planningTab.rowFieldLabels.priority')}
        onChange={on('showPriority')}
      />
    </div>
  );
}
