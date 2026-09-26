'use client';

import type { PlanningGanttTab, SettingsPlanningTabProps } from './SettingsPlanningTab.types';
import type {
  OccupancyTimelineScale,
  PlanningPhaseCardColorScheme,
} from '@/hooks/useLocalStorage';

import { useMemo } from 'react';

import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { usePlanningPhaseCardColorSchemeStorage } from '@/hooks/useLocalStorage';

import { CheckboxOption } from '../components/CheckboxOption';
import { OccupancySettingsSection } from '../components/OccupancySettingsSection';
import { Toggle } from '../components/Toggle';

import { SettingsPlanningTabRowFieldsGrid } from './SettingsPlanningTabRowFieldsGrid';

export function SettingsPlanningTab(props: SettingsPlanningTabProps) {
  const [phaseCardColorScheme, setPhaseCardColorScheme] = usePlanningPhaseCardColorSchemeStorage();
  const { t } = useI18n();
  const ganttTabs = useMemo(
    () =>
      [
        { id: 'swimlane' as const, label: t('settings.planningTab.ganttTabs.swimlane') },
        { id: 'kanban' as const, label: t('settings.planningTab.ganttTabs.kanban') },
      ] satisfies { id: PlanningGanttTab; label: string }[],
    [t]
  );
  const {
    epicOccupancyRowFields,
    epicOccupancyRowView,
    epicTimelineSettings,
    ganttTab,
    kanbanGroupBy,
    linksDimOnHover,
    occupancyTimelineScale,
    occupancyRowFields,
    occupancyRowView,
    quarterlyV2RowFields,
    quarterlyV2RowView,
    quarterlyV2ShowPlannedTasks,
    quarterlyV2TimelineSettings,
    setEpicOccupancyRowFields,
    setEpicOccupancyRowView,
    setEpicTimelineSettings,
    setGanttTab,
    setKanbanGroupBy,
    setLinksDimOnHover,
    setOccupancyTimelineScale,
    setOccupancyRowFields,
    setOccupancyRowView,
    setQuarterlyV2RowFields,
    setQuarterlyV2RowView,
    setQuarterlyV2ShowPlannedTasks,
    setQuarterlyV2TimelineSettings,
    setSwimlaneCalendarBusyVisible,
    setSwimlaneCardFields,
    setSwimlaneFactTimelineVisible,
    setSwimlaneLinksVisible,
    setTimelineSettings,
    swimlaneCalendarBusyVisible,
    swimlaneCardFields,
    swimlaneFactTimelineVisible,
    swimlaneLinksVisible,
    timelineSettings,
  } = props;

  return (
    <div className="space-y-6" role="tabpanel">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.planningTab.displaySection')}
        </h3>
        <Toggle
          checked={swimlaneLinksVisible}
          id="swimlane-links-visible"
          label={t('settings.planningTab.swimlaneLinks')}
          onChange={setSwimlaneLinksVisible}
        />
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('settings.planningTab.phaseColorScheme')}
          </span>
          <CustomSelect<PlanningPhaseCardColorScheme>
            className="w-full max-w-md"
            options={[
              { label: t('settings.planningTab.phaseColorByStatus'), value: 'status' },
              { label: t('settings.planningTab.phaseColorMonochrome'), value: 'monochrome' },
            ]}
            title={t('settings.planningTab.phaseColorSchemeTitle')}
            value={phaseCardColorScheme}
            onChange={setPhaseCardColorScheme}
          />
          {phaseCardColorScheme === 'monochrome' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
              {t('settings.planningTab.monochromeHint')}
            </p>
          )}
        </div>
        {swimlaneLinksVisible && (
          <div className="pl-1">
            <CheckboxOption
              checked={linksDimOnHover}
              label={t('settings.planningTab.dimUnlinkedOnHover')}
              onChange={setLinksDimOnHover}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-6">
              {t('settings.planningTab.dimUnlinkedHelp')}
            </p>
          </div>
        )}
      </section>

      <div
        className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-700/50"
        role="tablist"
      >
        {ganttTabs.map(({ id, label }) => {
          const isOn = ganttTab === id;
          return (
            <Button
              key={id}
              aria-selected={isOn}
              className={`flex-1 px-3 py-2 text-sm font-medium shadow-none ${
                isOn
                  ? '!bg-white !text-gray-900 shadow-sm hover:!bg-white dark:!bg-gray-700 dark:!text-gray-100 dark:hover:!bg-gray-700'
                  : '!text-gray-600 hover:!bg-gray-200/60 dark:!text-gray-400 dark:hover:!bg-gray-600/40 dark:hover:!text-gray-200'
              }`}
              role="tab"
              type="button"
              variant="ghost"
              onClick={() => setGanttTab(id)}
            >
              {label}
            </Button>
          );
        })}
      </div>

      {ganttTab === 'sprint' && (
        /* deprecated: вкладка занятости скрыта из tablist */
        <OccupancySettingsSection
          extraRowSettings={
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('settings.planningTab.occupancyRowFieldsHeading')}
              </h4>
              <SettingsPlanningTabRowFieldsGrid fields={occupancyRowFields} setFields={setOccupancyRowFields} />
            </div>
          }
          extraSettings={
            <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.planningTab.timelineLayoutMode')}
                </span>
                <CustomSelect<OccupancyTimelineScale>
                  className="w-full"
                  options={[
                    { label: t('settings.planningTab.sizingFull'), value: 'full' },
                    { label: t('settings.planningTab.sizingCompact'), value: 'compact' },
                  ]}
                  title={t('settings.planningTab.timelineLayoutTitle')}
                  value={occupancyTimelineScale}
                  onChange={(v) => setOccupancyTimelineScale(v)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <span className="block">{t('settings.planningTab.timelineFullHelp')}</span>
                  <span className="block">{t('settings.planningTab.timelineCompactHelp')}</span>
                </p>
              </div>
            </div>
          }
          rowView={occupancyRowView}
          sectionId="settings-occupancy-sprint"
          timelineSettings={timelineSettings}
          title={t('settings.planningTab.sectionTitles.sprint')}
          onRowViewChange={setOccupancyRowView}
          onTimelineSettingsChange={setTimelineSettings}
        />
      )}

      {ganttTab === 'epics' && (
        /* deprecated: вкладка эпиков скрыта из tablist, ветка только для старых сохранённых значений */
        <OccupancySettingsSection
          extraRowSettings={
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('settings.planningTab.occupancyRowFieldsHeading')}
              </h4>
              <SettingsPlanningTabRowFieldsGrid fields={epicOccupancyRowFields} setFields={setEpicOccupancyRowFields} />
            </div>
          }
          rowView={epicOccupancyRowView}
          sectionId="settings-occupancy-epic"
          timelineSettings={epicTimelineSettings}
          title={t('settings.planningTab.sectionTitles.epic')}
          onRowViewChange={setEpicOccupancyRowView}
          onTimelineSettingsChange={setEpicTimelineSettings}
        />
      )}

      {ganttTab === 'quarterly-v2' && (
        /* deprecated: вкладка квартала скрыта из tablist, ветка только для старых сохранённых значений */
        <OccupancySettingsSection
          extraRowSettings={
            <div className="space-y-4">
              <Toggle
                checked={quarterlyV2ShowPlannedTasks}
                id="quarterly-v2-show-planned-tasks"
                label={t('settings.planningTab.quarterlyShowPlannedTasks')}
                onChange={setQuarterlyV2ShowPlannedTasks}
              />
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('settings.planningTab.occupancyRowFieldsHeading')}
                </h4>
                <SettingsPlanningTabRowFieldsGrid fields={quarterlyV2RowFields} setFields={setQuarterlyV2RowFields} />
              </div>
            </div>
          }
          rowView={quarterlyV2RowView}
          sectionId="settings-occupancy-quarterly"
          showFactTimeline={false}
          timelineSettings={quarterlyV2TimelineSettings}
          title={t('settings.planningTab.sectionTitles.quarterly')}
          onRowViewChange={setQuarterlyV2RowView}
          onTimelineSettingsChange={setQuarterlyV2TimelineSettings}
        />
      )}

      {ganttTab === 'swimlane' && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('settings.planningTab.swimlaneSection')}
          </h3>
          <Toggle
            checked={swimlaneFactTimelineVisible}
            id="swimlane-fact-timeline"
            label={t('settings.planningTab.swimlaneFactTimeline')}
            onChange={setSwimlaneFactTimelineVisible}
          />
          <Toggle
            checked={swimlaneCalendarBusyVisible}
            id="swimlane-calendar-busy-planning"
            label={t('settings.planningTab.swimlaneCalendarBusy')}
            onChange={setSwimlaneCalendarBusyVisible}
          />
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('settings.planningTab.taskCardFieldsHeading')}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <CheckboxOption
                checked={swimlaneCardFields.showParent}
                label={t('settings.planningTab.parentIssue')}
                onChange={(checked) =>
                  setSwimlaneCardFields((prev) => ({ ...prev, showParent: checked }))
                }
              />
              <CheckboxOption
                checked={swimlaneCardFields.showKey}
                label={t('settings.planningTab.rowFieldLabels.issueKey')}
                onChange={(checked) =>
                  setSwimlaneCardFields((prev) => ({ ...prev, showKey: checked }))
                }
              />
              <CheckboxOption
                checked={swimlaneCardFields.showPriority}
                label={t('settings.planningTab.rowFieldLabels.priority')}
                onChange={(checked) =>
                  setSwimlaneCardFields((prev) => ({ ...prev, showPriority: checked }))
                }
              />
              <CheckboxOption
                checked={swimlaneCardFields.showType}
                label={t('settings.planningTab.rowFieldLabels.type')}
                onChange={(checked) =>
                  setSwimlaneCardFields((prev) => ({ ...prev, showType: checked }))
                }
              />
              <CheckboxOption
                checked={swimlaneCardFields.showEstimates ?? true}
                label={t('settings.planningTab.swimlaneEstimatesSpTp')}
                onChange={(checked) =>
                  setSwimlaneCardFields((prev) => ({ ...prev, showEstimates: checked }))
                }
              />
              <CheckboxOption
                checked={swimlaneCardFields.showStatus ?? true}
                label={t('settings.planningTab.rowFieldLabels.status')}
                onChange={(checked) =>
                  setSwimlaneCardFields((prev) => ({ ...prev, showStatus: checked }))
                }
              />
              <CheckboxOption
                checked={swimlaneCardFields.showSeverity ?? true}
                label={t('settings.planningTab.rowFieldLabels.severity')}
                onChange={(checked) =>
                  setSwimlaneCardFields((prev) => ({ ...prev, showSeverity: checked }))
                }
              />
            </div>
          </div>
        </section>
      )}

      {ganttTab === 'kanban' && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('settings.planningTab.kanbanSection')}
          </h3>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              htmlFor="kanban-group-by"
            >
              {t('settings.planningTab.kanbanGroupBy')}
            </label>
            <CustomSelect
              className="w-full"
              options={[
                { label: t('settings.planningTab.kanbanGroupNone'), value: 'none' },
                { label: t('settings.planningTab.kanbanGroupAssignee'), value: 'assignee' },
                { label: t('settings.planningTab.kanbanGroupParent'), value: 'parent' },
              ]}
              title={t('settings.planningTab.kanbanGroupTitle')}
              value={kanbanGroupBy}
              onChange={(v) => setKanbanGroupBy(v)}
            />
          </div>
        </section>
      )}
    </div>
  );
}
