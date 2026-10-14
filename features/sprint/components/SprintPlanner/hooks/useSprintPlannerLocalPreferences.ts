import { DEVELOPER_COLUMN_WIDTH } from '@/constants';
import {
  useDataSyncAssigneesStorage,
  useDataSyncEstimatesStorage,
  useFeatureColumnWidthStorage,
  useKanbanGroupByStorage,
  useLinksDimOnHoverStorage,
  useOccupancyAssigneeFilterStorage,
  useOccupancyOldTmLayoutStorage,
  useOccupancyRowFieldsStorage,
  useOccupancyStatusFilterStorage,
  useOccupancyTimelineScaleStorage,
  useOccupancyTimelineSettingsStorage,
  useParticipantsColumnWidthStorage,
  useSelectedBoardStorage,
  useSwimlaneCalendarBusyVisibleStorage,
  useSwimlaneFactTimelineVisibleStorage,
  useSwimlaneImagesVisibleStorage,
  useSwimlaneLinksVisibilityStorage,
  useSwimlaneNotesVisibleStorage,
} from '@/hooks/useLocalStorage';

/**
 * Настройки планировщика из localStorage (доска, занятость, свимлейн, синхронизация с трекером).
 * Собраны в одном месте, чтобы не размазывать десяток хуков по SprintPlanner.
 */
export function useSprintPlannerLocalPreferences() {
  const [selectedBoardId] = useSelectedBoardStorage();
  const [assigneeColumnWidth, setAssigneeColumnWidth] =
    useParticipantsColumnWidthStorage(DEVELOPER_COLUMN_WIDTH);
  const [featureColumnWidth, setFeatureColumnWidth] =
    useFeatureColumnWidthStorage(DEVELOPER_COLUMN_WIDTH);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useOccupancyAssigneeFilterStorage();
  const [timelineSettingsStorage] = useOccupancyTimelineSettingsStorage();
  const [swimlaneLinksVisible] = useSwimlaneLinksVisibilityStorage();
  const [swimlaneFactTimelineVisible] = useSwimlaneFactTimelineVisibleStorage();
  const [swimlaneCalendarBusyVisible] = useSwimlaneCalendarBusyVisibleStorage();
  const [swimlaneNotesVisible] = useSwimlaneNotesVisibleStorage();
  const [swimlaneImagesVisible] = useSwimlaneImagesVisibleStorage();
  const [linksDimOnHover] = useLinksDimOnHoverStorage();
  const [occupancyOldTmLayout] = useOccupancyOldTmLayoutStorage();
  const [occupancyRowFields] = useOccupancyRowFieldsStorage();
  const [occupancyStatusFilter, setOccupancyStatusFilter] = useOccupancyStatusFilterStorage();
  const [occupancyTimelineScale] = useOccupancyTimelineScaleStorage();
  const [syncAssignees] = useDataSyncAssigneesStorage();
  const [syncEstimates] = useDataSyncEstimatesStorage();
  const [kanbanGroupBy] = useKanbanGroupByStorage();

  return {
    selectedBoardId,
    assigneeColumnWidth,
    setAssigneeColumnWidth,
    featureColumnWidth,
    setFeatureColumnWidth,
    selectedAssigneeIds,
    setSelectedAssigneeIds,
    timelineSettingsStorage,
    swimlaneLinksVisible,
    swimlaneFactTimelineVisible,
    swimlaneCalendarBusyVisible,
    swimlaneNotesVisible,
    swimlaneImagesVisible,
    linksDimOnHover,
    occupancyOldTmLayout,
    occupancyRowFields,
    occupancyStatusFilter,
    setOccupancyStatusFilter,
    occupancyTimelineScale,
    syncAssignees,
    syncEstimates,
    kanbanGroupBy,
  };
}
