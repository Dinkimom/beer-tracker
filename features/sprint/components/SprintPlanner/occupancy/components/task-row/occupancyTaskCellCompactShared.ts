import type { AvatarInitialsVariant } from '@/components/Avatar';
import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task } from '@/types';

export interface OccupancyTaskCellCompactShared {
  assigneeDisplayName?: string;
  devAvatarUrl?: string | null;
  devAvatarVariant: AvatarInitialsVariant;
  devInitials?: string;
  displayKey: string;
  fields: OccupancyRowFieldsVisibility;
  formattedSp: string;
  formattedTp: string;
  qaAvatarUrl?: string | null;
  qaDisplayName?: string;
  qaInitials?: string;
  shouldShowTp: boolean;
  task: Task;
}
