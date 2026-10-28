import { DEVELOPER_COLUMN_WIDTH } from '@/constants';
import {
  useDataSyncAssigneesStorage,
  useDataSyncEstimatesStorage,
  useFeatureColumnWidthStorage,
  useKanbanGroupByStorage,
  useLinksDimOnHoverStorage,
  useOccupancyAssigneeFilterStorage,
  useParticipantsColumnWidthStorage,
  useSelectedBoardStorage,
  useSwimlaneFactTimelineVisibleStorage,
  useSwimlaneImagesVisibleStorage,
  useSwimlaneLinksVisibilityStorage,
  useSwimlaneNotesVisibleStorage,
} from '@/hooks/useLocalStorage';

/**
 * Настройки планировщика из localStorage (доска, свимлейн, канбан, синхронизация с трекером).
 * Собраны в одном месте, чтобы не размазывать десяток хуков по SprintPlanner.
 */
export function useSprintPlannerLocalPreferences() {
  const [selectedBoardId] = useSelectedBoardStorage();
  const [assigneeColumnWidth, setAssigneeColumnWidth] =
    useParticipantsColumnWidthStorage(DEVELOPER_COLUMN_WIDTH);
  const [featureColumnWidth, setFeatureColumnWidth] =
    useFeatureColumnWidthStorage(DEVELOPER_COLUMN_WIDTH);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useOccupancyAssigneeFilterStorage();
  const [swimlaneLinksVisible] = useSwimlaneLinksVisibilityStorage();
  const [swimlaneFactTimelineVisible] = useSwimlaneFactTimelineVisibleStorage();
  const [swimlaneNotesVisible] = useSwimlaneNotesVisibleStorage();
  const [swimlaneImagesVisible] = useSwimlaneImagesVisibleStorage();
  const [linksDimOnHover] = useLinksDimOnHoverStorage();
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
    swimlaneLinksVisible,
    swimlaneFactTimelineVisible,
    swimlaneNotesVisible,
    swimlaneImagesVisible,
    linksDimOnHover,
    syncAssignees,
    syncEstimates,
    kanbanGroupBy,
  };
}
