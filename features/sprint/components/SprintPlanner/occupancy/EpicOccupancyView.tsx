'use client';

import type { TimelineSettings } from './components/table/OccupancyTableHeader';
import type { SprintInfo } from './OccupancyView';
import type { OccupancyRowFieldsVisibility, OccupancyTimelineSettings } from '@/hooks/useLocalStorage';
import type { OccupancyTaskOrder } from '@/lib/api/types';
import type { Developer, StatusFilter, Task, TaskLink, TaskPosition } from '@/types';
import type React from 'react';

import { useState } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { SearchInput } from '@/components/SearchInput';
import { ZIndex } from '@/constants';
import {
  useEpicOccupancyOldTmLayoutStorage,
  useEpicOccupancyRowFieldsStorage,
  useEpicOccupancyTimelineSettingsStorage,
  useLinksDimOnHoverStorage,
  useSwimlaneLinksVisibilityStorage,
} from '@/hooks/useLocalStorage';

import { OccupancyAssigneeFilter } from '../components/OccupancyAssigneeFilter';

import { OccupancyView } from './OccupancyView';

interface EpicOccupancyViewProps {
  /** 1 = одна ячейка на день (режим квартального планирования), 3 = три части дня (по умолчанию) */
  cellsPerDay?: 1 | 3;
  developers: Developer[];
  /** Недельные колонки вместо дневных (квартальное планирование v2) */
  displayAsWeeks?: boolean;
  /** Плоский список задач без строк групп (эпик/стори) */
  flatTaskList?: boolean;
  /** Скрыть панель фильтров (поиск, статус задач, исполнители). Для страницы квартального планирования v2 */
  hideFilters?: boolean;
  /** Показывать оверлей загрузки только над таблицей (не над строкой фильтров) */
  isLoading?: boolean;
  legacyCompactLayout?: boolean;
  /** Режим фаз квартального плана: без доп. оценки, без ошибок валидации, синие фазы и эмодзи инструментов вместо аватара */
  quarterlyPhaseStyle?: boolean;
  rowFieldsVisibility?: OccupancyRowFieldsVisibility;
  /** ID задачи в режиме редактирования отрезков */
  segmentEditTaskId?: string | null;
  sprintInfos: SprintInfo[];
  /** Управляемый фильтр по статусу (при смене — запрос к бэку в EpicOccupancyTab) */
  statusFilter?: StatusFilter;
  taskLinks?: TaskLink[];
  taskOrder?: OccupancyTaskOrder;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  timelineSettings?: OccupancyTimelineSettings;
  /** Дни в шапке в две строки (квартальное планирование v2) */
  twoLineDayHeader?: boolean;
  /** Открыть пикер исполнителя для фазы (используется при добавлении/смене фазы) */
  onAddLink?: (link: { fromTaskId: string; toTaskId: string; id: string }) => Promise<void>;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean, hideRemoveFromPlan?: boolean) => void;
  /** Создание задачи в рамках стори (по родительской строке) */
  onCreateTaskForParent?: (row: { id: string; display: string; key?: string }) => void;
  onDeleteLink?: (linkId: string) => Promise<void>;
  onOpenAssigneePicker?: (data: {
    anchorRect: DOMRect;
    position: TaskPosition;
    task: Task;
    taskName: string;
  }) => void;
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void>;
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: (position: TaskPosition, segments: Array<{ startDay: number; startPart: number; duration: number }>, isQa: boolean) => void;
  onStatusFilterChange?: (value: StatusFilter) => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
}

/** Из настроек хранилища в формат TimelineSettings для OccupancyView (без enabled). */
function toTimelineSettings(settings: {
  showComments: boolean;
  showFreeSlotPreview: boolean;
  showGitlab?: boolean;
  showLinks: boolean;
  showReestimations: boolean;
  showStatuses: boolean;
}): TimelineSettings {
  return {
    showComments: settings.showComments,
    showFreeSlotPreview: settings.showFreeSlotPreview,
    showGitlab: settings.showGitlab ?? true,
    showLinks: settings.showLinks,
    showReestimations: settings.showReestimations,
    showStatuses: settings.showStatuses,
  };
}

/**
 * Отображение занятости эпика за несколько спринтов.
 * Тонкая обёртка над OccupancyView с включённым мультиспринтовым режимом.
 * Показывает фазы (таймлайны), связи и мультиспринтовую шапку.
 * Использует отдельные настройки отображения занятости эпиков (показ всей инфы, раскладка, таймлайн факта).
 */
export function EpicOccupancyView({
  developers,
  sprintInfos,
  taskLinks = [],
  taskOrder,
  taskPositions,
  tasks,
  cellsPerDay = 3,
  displayAsWeeks = false,
  hideFilters = false,
  flatTaskList = false,
  isLoading = false,
  quarterlyPhaseStyle = false,
  legacyCompactLayout: legacyCompactLayoutProp,
  rowFieldsVisibility: rowFieldsVisibilityProp,
  timelineSettings: timelineSettingsProp,
  statusFilter: statusFilterProp,
  onOpenAssigneePicker,
  onAddLink,
  onContextMenu,
  onDeleteLink,
  onPositionSave,
  onCreateTaskForParent,
  onSegmentEditCancel,
  onSegmentEditSave,
  onStatusFilterChange,
  onTaskOrderChange,
  segmentEditTaskId = null,
  twoLineDayHeader = false,
}: EpicOccupancyViewProps) {
  const sprintStartDate = sprintInfos[0]?.startDate ?? new Date();
  const [epicTimelineSettings] = useEpicOccupancyTimelineSettingsStorage();
  const [epicLegacyCompactLayout] = useEpicOccupancyOldTmLayoutStorage();
  const [epicRowFieldsVisibility] = useEpicOccupancyRowFieldsStorage();
  const [swimlaneLinksVisible] = useSwimlaneLinksVisibilityStorage();

  // Для отображения занятости по эпику всегда используем полный режим раскладки,
  // вне зависимости от старых значений в настройках.
  const legacyCompactLayout = legacyCompactLayoutProp ?? epicLegacyCompactLayout;
  const rowFieldsVisibility = rowFieldsVisibilityProp ?? epicRowFieldsVisibility;
  const timelineSettings = timelineSettingsProp ?? epicTimelineSettings;
  const [linksDimOnHover] = useLinksDimOnHoverStorage();
  const [globalNameFilter, setGlobalNameFilter] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<Set<string>>(new Set());
  const [internalStatusFilter, setInternalStatusFilter] = useState<StatusFilter>('all');
  const isControlled = statusFilterProp !== undefined && onStatusFilterChange !== undefined;
  const statusFilter = isControlled ? statusFilterProp! : internalStatusFilter;
  const setStatusFilter = isControlled ? onStatusFilterChange! : setInternalStatusFilter;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!hideFilters && (
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              className="max-w-xs shrink-0"
              placeholder="Поиск по названию задачи"
              size="md"
              value={globalNameFilter}
              onChange={setGlobalNameFilter}
            />
            <CustomSelect<StatusFilter>
              className="w-[200px] shrink-0"
              options={[
                { label: 'Все', value: 'all' },
                { label: 'Незавершенные', value: 'active' },
                { label: 'Завершенные', value: 'completed' },
              ]}
              selectedPrefix="Задачи: "
              size="compact"
              title="Фильтр по статусу задач"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
            />
            <OccupancyAssigneeFilter
              className="w-[min(100%,13rem)] shrink-0"
              developers={developers}
              selectedAssigneeIds={selectedAssigneeIds}
              onSelectionChange={setSelectedAssigneeIds}
            />
          </div>
        </div>
      )}

      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900"
            style={{ zIndex: ZIndex.overlay }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Загрузка задач…
              </span>
            </div>
          </div>
        )}
        <OccupancyView
          developers={developers}
          factVisible={quarterlyPhaseStyle ? false : timelineSettings.enabled}
          globalNameFilter={globalNameFilter}
          linksDimOnHover={linksDimOnHover}
          occupancyCallbacks={{
            onAddLink,
            onContextMenu,
            onCreateTaskForParent,
            onDeleteLink,
            onOpenAssigneePicker,
            onPositionSave,
            onSegmentEditCancel,
            onSegmentEditSave,
            onTaskOrderChange,
          }}
          occupancyLayout={{
            cellsPerDay,
            displayAsWeeks,
            flatTaskList,
            legacyCompactLayout,
            quarterlyPhaseStyle,
            rowFieldsVisibility,
            twoLineDayHeader,
          }}
          segmentEditTaskId={segmentEditTaskId}
          selectedAssigneeIds={selectedAssigneeIds.size > 0 ? selectedAssigneeIds : undefined}
          sprintInfos={sprintInfos}
          sprintStartDate={sprintStartDate}
          swimlaneLinksVisible={swimlaneLinksVisible}
          taskLinks={taskLinks}
          taskOrder={taskOrder}
          taskPositions={taskPositions}
          tasks={tasks}
          timelineSettings={toTimelineSettings(timelineSettings)}
        />
      </div>
    </div>
  );
}
