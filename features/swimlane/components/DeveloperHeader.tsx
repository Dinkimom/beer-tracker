'use client';

import type { SwimlanePointTotals } from '@/features/swimlane/hooks/useSwimlaneLayoutHelpers';

import { Avatar, type AvatarInitialsVariant } from '@/components/Avatar';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { wrapWithTextTooltip } from '@/components/TextTooltip';
import { DEVELOPER_COLUMN_WIDTH, ZIndex } from '@/constants';
import { PlannerHatchOverlay } from '@/features/sprint/components/SprintPlanner/layout/PlannerHatchOverlay';
import { SWIMLANE_GROUP_HOVER_REVEAL_CLASS } from '@/features/swimlane/utils/swimlaneHoverMotion';
import { roundPointsForDisplay } from '@/lib/pointsUtils';
import { getInitials } from '@/utils/displayUtils';

import {
  DeveloperHeaderLaneLabels,
  type DeveloperHeaderLaneLabelItem,
} from './DeveloperHeaderLaneLabels';
import {
  DeveloperHeaderPoints,
  formatDeveloperHeaderPointsContent,
  resolveDeveloperHeaderPointsVisibility,
  type DeveloperHeaderVelocityReadout,
} from './DeveloperHeaderPoints';

interface DeveloperHeaderProps {
  /** Доп. действия справа (например, кнопка меню) — показываются при наведении */
  actions?: React.ReactNode;
  /** Цвет инициалов без фото — как у исполнителя на карточке (`getAvatarVariantForDeveloper`). */
  avatarInitialsVariant?: AvatarInitialsVariant;
  /** URL фото профиля; при отсутствии показываются инициалы */
  avatarUrl?: string | null;
  developerName: string;
  /**
   * Закреплённая строка. Ячейка сама `sticky left`, поэтому вуаль должна
   * быть на ней: фон кадра строки при боковом скролле уезжает.
   */
  frosted?: boolean;
  hideAvatar?: boolean;
  /** Подписи дорожек факта / календаря, выровненные по таймлайну */
  laneLabels?: DeveloperHeaderLaneLabelItem[];
  /** Закреплённая строка рисуется выше остальных имён, но всё ещё над общим стеклом колонки. */
  layerZIndex?: number;
  /** Заменяет текст имени (ключ-ссылка в режиме фич). */
  nameContent?: React.ReactNode;
  /** Кнопка закрепления и др. контролы, видимость которых задаёт сам слот */
  persistentActions?: React.ReactNode;
  /** Итоги SP/TP строки: объём, сделано, неоценённые; режим отдельных QA-задач — только SP. */
  points: SwimlanePointTotals;
  /** Роль: для разработчика показываем только SP, для тестировщика — только TP */
  role?: 'developer' | 'other' | 'tester';
  /** Ручка высоты строки — на нижней границе всей строки (включая факт / календарь). */
  rowResizeHandle?: React.ReactNode;
  /**
   * Вертикальная позиция ручки (px от верха колонки).
   * По умолчанию — низ зоны задач (`taskAreaHeight`).
   */
  rowResizeHandleTopPx?: number;
  /** Строка фичи: в шапке сразу SP и TP */
  showBothPointKinds?: boolean;
  /** Показывать прогресс (сделано/всего и %). Если false — только объём. */
  showProgress?: boolean;
  /**
   * Высота зоны карточек задач (px). Исполнитель центрируется по ней,
   * а не по всей строке свимлейна (факт / календарь ниже).
   */
  taskAreaHeight?: number;
  /** `team` — общая строка: штриховка вместо имени, без аватара и SP/TP. */
  variant?: 'person' | 'team';
  /** Средний велосити за последние закрытые спринты. */
  velocity?: DeveloperHeaderVelocityReadout | null;
  /** Ширина колонки в px; по умолчанию DEVELOPER_COLUMN_WIDTH */
  width?: number;
}

export function DeveloperHeader({
  actions,
  avatarInitialsVariant,
  avatarUrl,
  developerName,
  frosted = false,
  hideAvatar = false,
  laneLabels = [],
  nameContent,
  taskAreaHeight,
  persistentActions,
  points,
  role,
  rowResizeHandle,
  rowResizeHandleTopPx,
  showBothPointKinds = false,
  showProgress = false,
  variant = 'person',
  velocity = null,
  width = DEVELOPER_COLUMN_WIDTH,
  layerZIndex = ZIndex.stickyLeftColumn,
}: DeveloperHeaderProps) {
  const isTeamLane = variant === 'team';
  const { hasPoints, showSP, showTP } = resolveDeveloperHeaderPointsVisibility(
    role,
    points.totalSP,
    points.totalTP,
    showBothPointKinds,
    points.hasVolumeTasks,
    points.hideTestPoints
  );
  const { spContent, tpContent } = formatDeveloperHeaderPointsContent(
    showProgress,
    points.completedSP,
    points.totalSP,
    points.percentSP,
    points.completedTP,
    points.totalTP,
    points.percentTP,
    showSP && showTP
  );
  // Неоценённые — того вида очков, что показан (строка фичи с SP и TP — по SP).
  const unestimatedCount = showSP ? points.unestimatedSP : points.unestimatedTP;
  const shownTotal = showSP ? points.totalSP : points.totalTP;

  return wrapWithTextTooltip(
    <div
      // border-b внутри ячейки (как у колонок дней): overflow-hidden иначе срезает box-shadow.
      className={`group relative sticky left-0 flex-shrink-0 self-stretch overflow-hidden border-b border-r border-gray-200 bg-transparent dark:border-b-gray-700 dark:border-r-gray-600${frosted ? ' planner-pinned-lane-glass' : ''}`}
      style={{
        width,
        minWidth: width,
        zIndex: layerZIndex,
      }}
    >
      {isTeamLane ? (
        <>
          <PlannerHatchOverlay />
          <span className="sr-only">{developerName}</span>
        </>
      ) : null}
      {actions || persistentActions ? (
        <div className="absolute top-2 right-2 z-10 flex h-6 items-center gap-0.5 leading-none">
          {persistentActions}
          {actions ? (
            <div className={`${SWIMLANE_GROUP_HOVER_REVEAL_CLASS} has-[:focus-visible]:opacity-100`}>
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {isTeamLane ? null : (
        <>
          <DeveloperHeaderLaneLabels items={laneLabels} />
          <div
            className="flex w-full items-center"
            style={{
              height: taskAreaHeight ?? '100%',
              paddingLeft: 12,
              paddingRight: 12,
            }}
          >
            <div className="flex min-w-0 w-full items-center gap-2.5">
              {hideAvatar ? null : (
                <Avatar
                  avatarUrl={avatarUrl}
                  initials={getInitials(developerName)}
                  initialsVariant={avatarInitialsVariant}
                  size="lg"
                  title={developerName}
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {nameContent ?? (
                  <OverflowTooltip content={developerName}>
                    <span className="min-w-0 truncate text-sm font-bold leading-tight text-gray-900 dark:text-gray-100">
                      {developerName}
                    </span>
                  </OverflowTooltip>
                )}
                <div className="min-w-0 text-[11px] tabular-nums leading-tight text-gray-500 dark:text-gray-400">
                  <DeveloperHeaderPoints
                    hasPoints={hasPoints}
                    showProgress={showProgress}
                    showSP={showSP}
                    showTP={showTP}
                    spContent={spContent}
                    tpContent={tpContent}
                    unestimated={{
                      count: unestimatedCount,
                      onlyUnestimated: !(showSP && showTP) && roundPointsForDisplay(shownTotal) <= 0,
                    }}
                    velocity={velocity}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {rowResizeHandle ? (
        <div
          className="absolute inset-x-0 z-10"
          style={{
            height: 0,
            top: rowResizeHandleTopPx ?? taskAreaHeight ?? '100%',
          }}
        >
          <div className="-translate-y-full">{rowResizeHandle}</div>
        </div>
      ) : null}
    </div>,
    isTeamLane ? developerName : undefined
  );
}
