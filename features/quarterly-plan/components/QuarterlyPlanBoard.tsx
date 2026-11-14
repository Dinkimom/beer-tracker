'use client';

import type { QuarterlyPlan } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { type CSSProperties, useEffect, useMemo, useRef } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { ParticipantsColumnResizeHandle } from '@/features/sprint/components/SprintPlanner/components/ParticipantsColumnResizeHandle';
import { SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import { useQuarterLeftColumnWidthStorage } from '@/hooks/useLocalStorage';
import { isEpicDone } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  clampQuarterLeftColumnWidth,
  QUARTER_LEFT_COLUMN_PX,
  QUARTER_ROW_HEIGHT_PX,
  QUARTER_WEEK_MIN_WIDTH_PX,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanAbsenceRow } from './QuarterlyPlanAbsenceRow';
import { QuarterlyPlanDirectionSection } from './QuarterlyPlanDirectionSection';
import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanLinksLayer } from './QuarterlyPlanLinksLayer';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';
import { QuarterlyPlanTeamHeader } from './QuarterlyPlanTeamHeader';
import { QuarterlyPlanTimelineHeader } from './QuarterlyPlanTimelineHeader';

const QUARTER_COLUMN_SELECTORS = { header: '[data-quarter-header]', rows: '[data-quarter-rows]' };

interface QuarterlyPlanBoardProps {
  /** Свёрнутые команды и направления: идентификаторы у них не пересекаются. */
  collapsedIds: ReadonlySet<string>;
  hideDone: boolean;
  plan: QuarterlyPlan;
  /** Меняется по кнопке «Текущий»: доска снова листает к текущей неделе. */
  todayNonce: number;
  onToggle: (id: string) => void;
}

/**
 * Сетка квартала: команды блоками, в каждой — отсутствия и направления с эпиками.
 * Команда сворачивается до своей строки со спринтами — так на доске помещается много команд.
 */
export function QuarterlyPlanBoard({
  collapsedIds,
  hideDone,
  plan,
  todayNonce,
  onToggle: toggle,
}: QuarterlyPlanBoardProps) {
  const { t } = useI18n();
  const { currentWeek, draft, linking, onDraftSubmit, onLinkSourceClear, onStartDraft, violatedBlockers, weeks } =
    useQuarterlyPlanBoard();
  const violatedLinkIds = useMemo(
    () =>
      new Set(
        plan.links
          .filter((link) => violatedBlockers.get(link.toId)?.some((blocker) => blocker.id === link.fromId))
          .map((link) => link.id)
      ),
    [plan.links, violatedBlockers]
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekCount = weeks.length;
  const [storedColumnWidth, setColumnWidth] = useQuarterLeftColumnWidthStorage(QUARTER_LEFT_COLUMN_PX);
  const columnWidth = clampQuarterLeftColumnWidth(storedColumnWidth);

  // Таймлайн шире экрана: при открытии квартала и по «Текущий» текущая неделя встаёт второй слева.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    // Ширину недели берём с дорожки, а не из ширины колонки: ручка колонки не должна листать доску.
    const track = scroller.querySelector('[data-quarter-track]');
    const weekPx = track ? track.getBoundingClientRect().width / weekCount : QUARTER_WEEK_MIN_WIDTH_PX;
    scroller.scrollLeft = Math.max(0, (currentWeek - 1) * weekPx);
  }, [currentWeek, todayNonce, weekCount]);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-thin-custom min-h-0 flex-1 overflow-auto"
      // Связь: клик мимо полос (и мимо кнопок удаления связей) снимает выбранный источник.
      onClickCapture={(event) => {
        const target = event.target as Element;
        if (linking.sourceId && !target.closest('[data-quarter-bar], [data-link-delete-handle]')) {
          event.stopPropagation();
          onLinkSourceClear();
        }
      }}
    >
      {/* Нижний отступ — как у свимлейна, под остров с контролами: он не закрывает последние строки. */}
      <div
        className="relative"
        style={
          {
            '--quarter-left-col': `${columnWidth}px`,
            minWidth: columnWidth + weeks.length * QUARTER_WEEK_MIN_WIDTH_PX,
            paddingBottom: SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX,
          } as CSSProperties
        }
      >
        {/* Ручка ширины колонки эпиков — та же, что у колонки исполнителей на свимлейне. */}
        <ParticipantsColumnResizeHandle
          clampWidth={clampQuarterLeftColumnWidth}
          columnWidth={columnWidth}
          scrollContainerRef={scrollRef}
          selectors={QUARTER_COLUMN_SELECTORS}
          title={t('quarterlyPlan.resizeColumn')}
          onWidthChange={setColumnWidth}
        />
        <QuarterlyPlanLinksLayer links={plan.links} violatedLinkIds={violatedLinkIds} />
        <QuarterlyPlanTimelineHeader
          columnLabel={t('quarterlyPlan.columnDirections')}
          title={t('quarterlyPlan.quarterLabel', { quarter: plan.quarter, year: plan.year })}
        />
        <div data-quarter-rows>
          {plan.teams.map((team) => {
            const addingDirection = draft?.kind === 'newDirection' && draft.teamId === team.id;
            // Новое направление видно и в свёрнутой команде: иначе поле ввода некуда показать.
            const collapsed = collapsedIds.has(team.id) && !addingDirection;
            return (
              <section
                key={team.id}
                aria-label={team.title}
                className={collapsed ? '' : 'border-b border-ds-border-subtle'}
              >
                <QuarterlyPlanTeamHeader
                  collapsed={collapsed}
                  team={team}
                  onToggle={() => toggle(team.id)}
                />
                {collapsed ? null : (
                  <>
                    <QuarterlyPlanAbsenceRow team={team} />
                    {plan.directions
                      .filter((direction) => direction.teamId === team.id)
                      .map((direction) => {
                        const epics = plan.epics.filter((epic) => epic.directionId === direction.id);
                        return (
                          <QuarterlyPlanDirectionSection
                            key={direction.id}
                            collapsed={collapsedIds.has(direction.id)}
                            direction={direction}
                            epics={hideDone ? epics.filter((epic) => !isEpicDone(epic, plan.trackerEpics)) : epics}
                            onToggle={() => toggle(direction.id)}
                          />
                        );
                      })}
                    {/* Пустая команда: кнопка «+» в шапке видна только при наведении, поэтому зовём явно. */}
                    {!addingDirection && !plan.directions.some((direction) => direction.teamId === team.id) ? (
                      <QuarterlyPlanRow
                        heightPx={QUARTER_ROW_HEIGHT_PX + 8}
                        left={
                          <div className="flex min-w-0 flex-1 px-2">
                            <Button
                              className="h-8 min-h-0 gap-1.5 whitespace-nowrap !px-2 !py-0 text-sm"
                              variant="ghost"
                              onClick={() => onStartDraft({ kind: 'newDirection', teamId: team.id })}
                            >
                              <Icon className="h-4 w-4" name="plus" />
                              {t('quarterlyPlan.addDirection')}
                            </Button>
                          </div>
                        }
                        tone="direction"
                      />
                    ) : null}
                    {addingDirection ? (
                      <QuarterlyPlanRow
                        heightPx={QUARTER_ROW_HEIGHT_PX}
                        left={
                          <div className="flex min-w-0 flex-1 pl-3 pr-2">
                            <QuarterlyPlanInlineInput
                              placeholder={t('quarterlyPlan.addDirectionPlaceholder')}
                              onSubmit={onDraftSubmit}
                            />
                          </div>
                        }
                        tone="direction"
                      />
                    ) : null}
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
