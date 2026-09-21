import type { AvatarInitialsVariant } from '@/components/Avatar';
import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { SidebarTasksTab, Task } from '@/types';
import type { MouseEvent } from 'react';

export interface OccupancyTaskCellProps {
  assigneeDisplayName?: string;
  devAvatarUrl?: string | null;
  devAvatarVariant?: AvatarInitialsVariant;
  devInitials?: string;
  displayKey: string;
  dragHandle: { attributes: object; listeners: object | undefined } | null;
  goalStoryEpicNames?: Set<string>;
  hasFact?: boolean;
  hasQa: boolean;
  isPlanned: boolean;
  legacyCompactLayout?: boolean;
  mainTask: Task;
  qaAvatarUrl?: string | null;
  qaDisplayName?: string;
  qaInitials?: string;
  qaTask?: Task | null;
  rowFieldsVisibility?: OccupancyRowFieldsVisibility;
  rowHeightMinusBorder: number;
  rowOpacity?: number;
  task: Task;
  taskColumnWidth: number;
  unplannedWarning: SidebarTasksTab | null;
  onContextMenu?: (e: MouseEvent, task: Task, isBacklogTask?: boolean, hideRemoveFromPlan?: boolean) => void;
  onTaskClick?: (taskId: string) => void;
  setTaskRowRef: (taskId: string) => (el: HTMLDivElement | null) => void;
}
