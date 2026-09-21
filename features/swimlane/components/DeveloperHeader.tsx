'use client';

import { Avatar } from '@/components/Avatar';
import { DEVELOPER_COLUMN_WIDTH, ZIndex } from '@/constants';
import { PlannerHatchOverlay } from '@/features/sprint/components/SprintPlanner/layout/PlannerHatchOverlay';
import { getInitials } from '@/utils/displayUtils';

import {
  DeveloperHeaderLaneLabels,
  type DeveloperHeaderLaneLabelItem,
} from './DeveloperHeaderLaneLabels';
import {
  DeveloperHeaderPoints,
  formatDeveloperHeaderPointsContent,
  resolveDeveloperHeaderPointsVisibility,
} from './DeveloperHeaderPoints';

interface DeveloperHeaderProps {
  /** Доп. действия справа (например, кнопка меню) — показываются при наведении */
  actions?: React.ReactNode;
  /** URL фото профиля; при отсутствии показываются инициалы */
  avatarUrl?: string | null;
  /** Сделано SP (для прогресса) */
  completedSP?: number;
  completedTP?: number;
  developerName: string;
  /** Есть ли на строке задачи с объёмом (даже если SP/TP = 0). */
  hasTasks?: boolean;
  hideAvatar?: boolean;
  /** Подписи дорожек факта / календаря, выровненные по таймлайну */
  laneLabels?: DeveloperHeaderLaneLabelItem[];
  /** Заменяет текст имени (ключ-ссылка в режиме фич). */
  nameContent?: React.ReactNode;
  percentSP?: number;
  percentTP?: number;
  /** Кнопка закрепления и др. контролы, видимость которых задаёт сам слот */
  persistentActions?: React.ReactNode;
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
  totalSP: number;
  totalTP: number;
  /** `team` — общая строка: штриховка вместо имени, без аватара и SP/TP. */
  variant?: 'person' | 'team';
  /** Ширина колонки в px; по умолчанию DEVELOPER_COLUMN_WIDTH */
  width?: number;
}

export function DeveloperHeader({
  actions,
  avatarUrl,
  developerName,
  hasTasks,
  hideAvatar = false,
  laneLabels = [],
  nameContent,
  taskAreaHeight,
  totalSP,
  totalTP,
  completedSP = 0,
  completedTP = 0,
  percentSP = 0,
  percentTP = 0,
  persistentActions,
  role,
  rowResizeHandle,
  rowResizeHandleTopPx,
  showBothPointKinds = false,
  showProgress = false,
  variant = 'person',
  width = DEVELOPER_COLUMN_WIDTH,
}: DeveloperHeaderProps) {
  const isTeamLane = variant === 'team';
  const { hasPoints, showSP, showTP } = resolveDeveloperHeaderPointsVisibility(
    role,
    totalSP,
    totalTP,
    showBothPointKinds,
    hasTasks
  );
  const { spContent, tpContent } = formatDeveloperHeaderPointsContent(
    showProgress,
    completedSP,
    totalSP,
    percentSP,
    completedTP,
    totalTP,
    percentTP,
    showSP && showTP
  );

  return (
    <div
      className="group relative flex-shrink-0 sticky left-0 self-stretch overflow-hidden border-r-1 border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
      style={{
        width,
        minWidth: width,
        zIndex: ZIndex.stickyLeftColumn,
      }}
      title={isTeamLane ? developerName : undefined}
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
            <div className="opacity-0 transition-opacity group-hover:opacity-100 has-[:focus-visible]:opacity-100">
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
                  size="lg"
                  title={developerName}
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {nameContent ?? (
                  <span
                    className="min-w-0 truncate text-sm font-bold leading-tight text-gray-900 dark:text-gray-100"
                    title={developerName}
                  >
                    {developerName}
                  </span>
                )}
                <div className="min-w-0 whitespace-nowrap text-[11px] tabular-nums leading-tight text-gray-500 dark:text-gray-400">
                  <DeveloperHeaderPoints
                    hasPoints={hasPoints}
                    showProgress={showProgress}
                    showSP={showSP}
                    showTP={showTP}
                    spContent={spContent}
                    tpContent={tpContent}
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
    </div>
  );
}
