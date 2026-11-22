'use client';

import type { QuarterlyPlan } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';
import { type CSSProperties, Fragment, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { ParticipantsColumnResizeHandle } from '@/features/sprint/components/SprintPlanner/components/ParticipantsColumnResizeHandle';
import { PlannerParticipantsColumnGlass } from '@/features/sprint/components/SprintPlanner/components/PlannerParticipantsColumnGlass';
import { SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import { useQuarterLeftColumnWidthStorage } from '@/hooks/useLocalStorage';
import { isEpicDone } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { topLevelEpics } from '@/lib/quarterlyPlans/quarterlyPlanRows';

import { QuarterSprintStartWeeksProvider, useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import {
  clampQuarterLeftColumnWidth,
  QUARTER_LEFT_COLUMN_PX,
  QUARTER_ROW_HEIGHT_PX,
  sprintStartWeeks,
} from '../quarterlyPlanBoardModel';
import { QUARTER_WEEK_MIN_WIDTH_BY_DETAIL } from '../quarterlyPlanDetail';

import { QuarterlyPlanAbsenceRow } from './QuarterlyPlanAbsenceRow';
import { QuarterlyPlanDirectionSection } from './QuarterlyPlanDirectionSection';
import { QuarterlyPlanInputRow } from './QuarterlyPlanInputRow';
import { QuarterlyPlanLinksLayer } from './QuarterlyPlanLinksLayer';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';
import { QuarterlyPlanTeamHeader } from './QuarterlyPlanTeamHeader';
import { QuarterlyPlanTimelineHeader } from './QuarterlyPlanTimelineHeader';

const QUARTER_COLUMN_SELECTORS = { header: '[data-quarter-header]', rows: '[data-quarter-rows]' };

interface QuarterlyPlanBoardProps {
  hideDone: boolean;
  /** Рядом открыт сайдбар (история версий, цели спринта): доска уже, но недели не сжимаются — появляется прокрутка. */
  holdWidth: boolean;
  plan: QuarterlyPlan;
  /** Меняется по кнопке «Текущий»: доска снова листает к текущей неделе. */
  todayNonce: number;
}

/**
 * Сетка квартала: команды блоками, в каждой — отсутствия и направления с эпиками.
 * Команда сворачивается до своей строки со спринтами — так на доске помещается много команд.
 */
export const QuarterlyPlanBoard = observer(function QuarterlyPlanBoard({
  hideDone,
  holdWidth,
  plan,
  todayNonce,
}: QuarterlyPlanBoardProps) {
  const { t } = useI18n();
  const { detail, links, rows } = useQuarterlyPlanBoard();
  const { currentWeek, shownLinks, violatedBlockers, weeks } = useQuarterPlanView();
  const linking = { armed: links.armed, sourceId: links.sourceId };
  const onLinkSourceClear = links.clearSource;
  const { collapsedIds, draft, startDraft: onStartDraft, toggleCollapsed: toggle } = rows;

  const directionInput = <QuarterlyPlanInputRow level="direction" placeholder={t('quarterlyPlan.addDirectionPlaceholder')} />;
  const violatedLinkIds = useMemo(() => {
    const violated = new Set(
      plan.links
        .filter((link) => violatedBlockers.get(link.toId)?.some((blocker) => blocker.id === link.fromId))
        .map((link) => link.id)
    );
    // Стрелка уровня «Квартал» нарушена, если нарушена хоть одна связь назначений за ней (QL7).
    return new Set(
      shownLinks.filter((link) => (link.linkIds ?? [link.id]).some((id) => violated.has(id))).map((link) => link.id)
    );
  }, [plan.links, shownLinks, violatedBlockers]);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Ширина доски без сайдбара: пока он открыт, сетка держит её, и недели остаются той же ширины.
  const [fullWidth, setFullWidth] = useState(0);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || holdWidth) return undefined;
    const observer = new ResizeObserver(() => setFullWidth(scroller.clientWidth));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [holdWidth]);
  const weekCount = weeks.length;
  const weekMinWidth = QUARTER_WEEK_MIN_WIDTH_BY_DETAIL[detail];
  const [storedColumnWidth, setColumnWidth] = useQuarterLeftColumnWidthStorage(QUARTER_LEFT_COLUMN_PX);
  const columnWidth = clampQuarterLeftColumnWidth(storedColumnWidth);

  // Таймлайн шире экрана: при открытии квартала и по «Текущий» текущая неделя встаёт второй слева.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    // Ширину недели берём с дорожки, а не из ширины колонки: ручка колонки не должна листать доску.
    const track = scroller.querySelector('[data-quarter-track]');
    const weekPx = track ? track.getBoundingClientRect().width / weekCount : weekMinWidth;
    scroller.scrollLeft = Math.max(0, (currentWeek - 1) * weekPx);
    // Смена детализации меняет ширину недели — текущая неделя снова встаёт на место (QZ2).
  }, [currentWeek, todayNonce, weekCount, weekMinWidth]);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-thin-custom min-h-0 flex-1 overflow-auto"
      data-quarter-scroller
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
            minWidth: Math.max(columnWidth + weeks.length * weekMinWidth, holdWidth ? fullWidth : 0),
            paddingBottom: SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX,
            // Сверху — место под стеклянную панель контролов: доска начинается под ней и проезжает под неё.
            paddingTop: 'var(--planner-controls-h, 0px)',
          } as CSSProperties
        }
      >
        {/* Стекло колонки — как у колонки исполнителей на доске спринта: одна плашка на всю видимую высоту,
            полосы и заметки проезжают под ней размытыми, подписи строк лежат выше и остаются резкими. */}
        <PlannerParticipantsColumnGlass
          className="sticky left-0"
          fillScrollport
          scrollerSelector="[data-quarter-scroller]"
          style={{ zIndex: ZIndex.stickyInContent }}
          width={columnWidth}
        />
        {/* Ручка ширины колонки эпиков — та же, что у колонки исполнителей на свимлейне. */}
        <ParticipantsColumnResizeHandle
          clampWidth={clampQuarterLeftColumnWidth}
          columnWidth={columnWidth}
          scrollContainerRef={scrollRef}
          selectors={QUARTER_COLUMN_SELECTORS}
          title={t('quarterlyPlan.resizeColumn')}
          onWidthChange={setColumnWidth}
        />
        <QuarterlyPlanLinksLayer violatedLinkIds={violatedLinkIds} />
        <QuarterlyPlanTimelineHeader
          columnLabel={t('quarterlyPlan.columnDirections')}
          title={t('quarterlyPlan.quarterLabel', { quarter: plan.quarter, year: plan.year })}
        />
        <div data-quarter-rows>
          {plan.teams.map((team) => {
            const addingDirection = draft?.kind === 'newDirection' && draft.teamId === team.id;
            const directions = plan.directions.filter((direction) => direction.teamId === team.id);
            // Поле нового направления — под направлением, из меню которого его добавили (QO1); иначе в конце.
            const inputAfterId = addingDirection ? directions.find((direction) => direction.id === draft.afterId)?.id : undefined;
            // Новое направление видно и в свёрнутой команде: иначе поле ввода некуда показать.
            const collapsed = collapsedIds.has(team.id) && !addingDirection;
            return (
              <section
                key={team.id}
                aria-label={team.title}
                className="relative"
              >
                {/* Нижняя граница команды — поверх стекла колонки: border секции лежал бы под ним и размывался. */}
                {collapsed ? null : (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-ds-border-subtle"
                    style={{ zIndex: ZIndex.stickyInContent + 1 }}
                  />
                )}
                <QuarterlyPlanTeamHeader
                  collapsed={collapsed}
                  team={team}
                  onToggle={() => toggle(team.id)}
                />
                {collapsed ? null : (
                  <QuarterSprintStartWeeksProvider value={sprintStartWeeks(team.sprints, weeks)}>
                    <QuarterlyPlanAbsenceRow group="duty" team={team} />
                    <QuarterlyPlanAbsenceRow group="away" team={team} />
                    {directions.map((direction) => {
                      const epics = topLevelEpics(plan.epics, direction.id);
                      return (
                        <Fragment key={direction.id}>
                          <QuarterlyPlanDirectionSection
                            collapsed={collapsedIds.has(direction.id)}
                            direction={direction}
                            epics={hideDone ? epics.filter((epic) => !isEpicDone(epic, plan.trackerEpics)) : epics}
                            onToggle={() => toggle(direction.id)}
                          />
                          {inputAfterId === direction.id ? directionInput : null}
                        </Fragment>
                      );
                    })}
                    {/* Пустая команда: кнопка «+» в шапке видна только при наведении, поэтому зовём явно. */}
                    {!addingDirection && directions.length === 0 ? (
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
                    {addingDirection && !inputAfterId ? directionInput : null}
                  </QuarterSprintStartWeeksProvider>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
});
