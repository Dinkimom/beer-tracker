import type { AvatarInitialsVariant } from '@/components/Avatar';

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
  displayId?: string;
  estimateLabel?: string;
  isDragging?: boolean;
  parentLabel?: string;
}
