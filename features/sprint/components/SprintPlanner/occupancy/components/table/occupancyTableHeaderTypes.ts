import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { OccupancyTaskOrder } from '@/lib/api/types';
import type { Task } from '@/types';

export interface SprintInfo {
  endDate?: Date;
  id: number | string;
  name: string;
  quarter?: string | null;
  startDate: Date;
}

export interface TimelineSettings {
  showComments: boolean;
  showFreeSlotPreview: boolean;
  showGitlab: boolean;
  showLinks: boolean;
  showReestimations: boolean;
  showStatuses: boolean;
}

export interface OccupancyTableHeaderProps {
  allExpanded: boolean;
  dayColumnWidth: number | undefined;
  displayAsWeeks?: boolean;
  displayColumnCount?: number;
  errorDayDetails: Map<number, DayErrorDetail[]>;
  errorDayIndices: Set<number>;
  holidayDayIndices?: Set<number>;
  isReorderMode: boolean;
  isResizing: boolean;
  parentIds: string[];
  quarterlySplitTaskColumns?: boolean;
  quarterlyWeekTimelineHeader?: boolean;
  setIsReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
  showHolidayEmoji?: boolean;
  sprintInfos?: SprintInfo[];
  sprintStartDate: Date;
  sprintWorkingDaysCount?: number;
  taskColumnWidth: number;
  tasks: Task[];
  totalStoryPoints: number;
  totalTestPoints: number;
  twoLineDayHeader?: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onHoveredErrorTaskIdChange: (taskId: string | null) => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
  setIsResizing: (value: boolean) => void;
}
