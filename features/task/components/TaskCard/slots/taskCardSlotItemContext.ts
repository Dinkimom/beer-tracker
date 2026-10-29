import type { AvatarInitialsVariant } from '@/components/Avatar';
import type { Developer } from '@/types';

export interface TaskCardSlotAssignee {
  avatarUrl?: string | null;
  initials: string;
  initialsVariant: AvatarInitialsVariant;
  label: string;
}

export interface TaskCardKeyLinkProps {
  href: string;
  rel: 'noopener noreferrer';
  style: { pointerEvents: 'auto' | 'none' };
  target: '_blank';
  title: string;
  onClick: (event: React.MouseEvent) => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onPointerDown: (event: React.PointerEvent) => void;
}

export interface TaskCardSlotItemContext {
  assignee?: TaskCardSlotAssignee;
  /** Сотрудники: аватары пользователей из полей трекера. */
  developers?: readonly Developer[];
  displayId?: string;
  estimateLabel?: string;
  isDragging?: boolean;
  parentLabel?: string;
}
