'use client';

import { Avatar, type AvatarInitialsVariant } from '@/components/Avatar';
import { getDisplayShortName } from '@/utils/displayUtils';

interface TaskCardFeatureLaneAssigneeChipProps {
  assigneeAvatarUrl?: string | null;
  assigneeAvatarVariant: AvatarInitialsVariant;
  assigneeInitials: string;
  assigneeLabel: string;
}

/** Исполнитель в подвале: аватар слева от «Имя Ф.». */
export function TaskCardFeatureLaneAssigneeChip({
  assigneeAvatarUrl,
  assigneeAvatarVariant,
  assigneeInitials,
  assigneeLabel,
}: TaskCardFeatureLaneAssigneeChipProps) {
  return (
    <span
      className="ml-auto flex min-w-0 max-w-[60%] items-center justify-end gap-1 text-[10px] font-medium leading-tight text-gray-700 dark:text-gray-200"
      title={assigneeLabel}
    >
      <Avatar
        avatarUrl={assigneeAvatarUrl}
        className="shrink-0"
        initials={assigneeInitials}
        initialsVariant={assigneeAvatarVariant}
        size="2xs"
        title={assigneeLabel}
      />
      <span className="min-w-0 truncate text-right">{getDisplayShortName(assigneeLabel)}</span>
    </span>
  );
}
