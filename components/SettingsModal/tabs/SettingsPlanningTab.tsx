'use client';

import type { PlanningGanttTab, SettingsPlanningTabProps } from './SettingsPlanningTab.types';
import type { PlanningPhaseCardColorScheme, SwimlaneLinksIdleMode } from '@/hooks/useLocalStorage';
import type { TaskCardBoard } from '@/lib/taskCard/taskCardSlots';

import { useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { TaskCardDisplayDialog } from '@/features/task/components/TaskCard/slots/TaskCardDisplayDialog';
import {
  usePlanningPhaseCardColorSchemeStorage,
  useSwimlaneLinksIdleModeStorage,
} from '@/hooks/useLocalStorage';

import { Toggle } from '../components/Toggle';

export function SettingsPlanningTab(props: SettingsPlanningTabProps) {
  const [phaseCardColorScheme, setPhaseCardColorScheme] = usePlanningPhaseCardColorSchemeStorage();
  const [linksIdleMode, setLinksIdleMode] = useSwimlaneLinksIdleModeStorage();
  const [cardDisplayOpen, setCardDisplayOpen] = useState(false);
  const [cardDisplayBoard, setCardDisplayBoard] = useState<TaskCardBoard>('swimlane');
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
    ganttTab,
    kanbanGroupBy,
    linksDimOnHover,
    setGanttTab,
    setKanbanGroupBy,
    setLinksDimOnHover,
    setSwimlaneFactTimelineVisible,
    setSwimlaneLinksVisible,
    swimlaneFactTimelineVisible,
    swimlaneLinksVisible,
  } = props;

  return (
    <div className="space-y-5" role="tabpanel">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ds-text-muted">
          {t('settings.planningTab.displaySection')}
        </h3>
        <Toggle
          checked={swimlaneLinksVisible}
          id="swimlane-links-visible"
          label={t('settings.planningTab.swimlaneLinks')}
          onChange={setSwimlaneLinksVisible}
        />
        {swimlaneLinksVisible ? (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings.planningTab.linksIdleMode')}
            </span>
            <CustomSelect<SwimlaneLinksIdleMode>
              className="w-full max-w-md"
              options={[
                { label: t('settings.planningTab.linksIdleModeImportant'), value: 'important' },
                { label: t('settings.planningTab.linksIdleModeAll'), value: 'all' },
                { label: t('settings.planningTab.linksIdleModeHover'), value: 'hover' },
              ]}
              title={t('settings.planningTab.linksIdleMode')}
              value={linksIdleMode}
              onChange={setLinksIdleMode}
            />
            <p className="mt-1 max-w-md text-xs text-ds-text-muted">
              {t('settings.planningTab.linksIdleModeHint')}
            </p>
          </div>
        ) : null}
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
            <p className="mt-1 max-w-md text-xs text-ds-text-muted">
              {t('settings.planningTab.monochromeHint')}
            </p>
          )}
        </div>
        {swimlaneLinksVisible ? (
          <Toggle
            checked={linksDimOnHover}
            hint={t('settings.planningTab.dimUnlinkedHelp')}
            id="links-dim-on-hover"
            label={t('settings.planningTab.dimUnlinkedOnHover')}
            onChange={setLinksDimOnHover}
          />
        ) : null}
      </section>

      <div className="flex gap-1" role="tablist">
        {ganttTabs.map(({ id, label }) => {
          const isOn = ganttTab === id;
          return (
            <Button
              key={id}
              aria-selected={isOn}
              className={`h-7 min-h-0 !rounded-md !border-0 !px-2.5 !py-0 text-sm font-medium shadow-none ${
                isOn
                  ? '!bg-ds-canvas !text-blue-600 hover:!bg-gray-100 dark:!bg-white/10 dark:!text-blue-300 dark:hover:!bg-white/15'
                  : '!bg-transparent !text-ds-text-muted hover:!bg-black/[0.04] hover:!text-gray-900 dark:hover:!bg-white/10 dark:hover:!text-gray-100'
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

      {ganttTab === 'swimlane' && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ds-text-muted">
            {t('settings.planningTab.swimlaneSection')}
          </h3>
          <Toggle
            checked={swimlaneFactTimelineVisible}
            id="swimlane-fact-timeline"
            label={t('settings.planningTab.swimlaneFactTimeline')}
            onChange={setSwimlaneFactTimelineVisible}
          />
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-medium uppercase tracking-wide text-ds-text-muted">
              {t('settings.planningTab.taskCardFieldsHeading')}
            </h4>
            <p className="text-xs leading-relaxed text-ds-text-muted">{t('settings.planningTab.cardSlots.hint')}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCardDisplayBoard('swimlane');
                setCardDisplayOpen(true);
              }}
            >
              {t('settings.planningTab.cardSlots.open')}
            </Button>
          </div>
        </section>
      )}

      {ganttTab === 'kanban' && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ds-text-muted">
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
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-medium uppercase tracking-wide text-ds-text-muted">
              {t('settings.planningTab.taskCardFieldsHeading')}
            </h4>
            <p className="text-xs leading-relaxed text-ds-text-muted">{t('settings.planningTab.cardSlots.kanbanHint')}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCardDisplayBoard('kanban');
                setCardDisplayOpen(true);
              }}
            >
              {t('settings.planningTab.cardSlots.open')}
            </Button>
          </div>
        </section>
      )}
      <TaskCardDisplayDialog
        board={cardDisplayBoard}
        nested
        open={cardDisplayOpen}
        onClose={() => {
          setCardDisplayOpen(false);
        }}
      />
    </div>
  );
}
