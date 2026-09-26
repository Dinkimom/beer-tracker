import type { PlanningPhaseCardColorScheme, SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant } from '@/types';
import type { CSSProperties } from 'react';

import { getStickyNotePaint } from '@/features/comments/utils/stickyNotePalette';
import { getDiagramCardDeleteButtonStyle } from '@/features/task/utils/diagramCardSurface';
import { getPhotoCardDeleteButtonStyle } from '@/features/task/utils/photoCardSurface';
import { getPhaseLinkArrowDefaultHex } from '@/utils/statusColors';

export const TASK_CARD_GLOW_CSS_VAR = '--task-card-glow-color';

export function shouldRenderTaskCardSidebarSplit(params: {
  showExtraSplit: boolean;
  variant: TaskCardVariant;
}): boolean {
  return params.showExtraSplit && params.variant === 'sidebar';
}

export function resolveTaskCardSwimlaneFields(
  isSwimlane: boolean,
  swimlaneCardFields: SwimlaneCardFieldsVisibility | undefined
): SwimlaneCardFieldsVisibility | undefined {
  return isSwimlane ? swimlaneCardFields : undefined;
}

export function buildTaskCardRootClassName(params: {
  borderClasses: string;
  cardBorderColorClasses: string;
  cardSurfaceClasses: string;
  className: string;
  contextMenuBorderClasses: string;
  contextMenuZClasses: string;
  cursorClass: string;
  dimmedClasses: string;
  hoverShadowClasses: string;
  isResizing: boolean;
  paddingClasses: string;
  radiusClass?: string;
  ringClasses: string;
  sidebarOpacityClasses: string;
  sizeVariantClasses: string;
}): string {
  const radiusClass = params.radiusClass ?? 'rounded-lg';
  return `${params.cardSurfaceClasses} ${params.cardBorderColorClasses} ${radiusClass} ${params.sizeVariantClasses} ${params.cursorClass} ${params.hoverShadowClasses} flex flex-col relative ${params.paddingClasses} overflow-visible ${
    params.isResizing ? 'select-none' : ''
  } ${params.ringClasses} ${params.contextMenuZClasses} ${params.dimmedClasses} ${params.sidebarOpacityClasses} ${params.borderClasses}${params.contextMenuBorderClasses} task-card-context-menu-frame ${params.className}`;
}

export function buildTaskCardHoverShadowClasses(
  effectiveIsLocalTask: boolean,
  isDragging: boolean,
  isResizing: boolean,
  linkingActive = false,
  /** Sticky notes are local drafts but still get the same hover accent as tasks. */
  isStickyNote = false
): string {
  const suppressAccent = effectiveIsLocalTask && !isStickyNote;
  if (!isResizing && !isDragging && !suppressAccent && !linkingActive) {
    return 'task-card-swimlane-hover-shadow';
  }
  return '';
}

/** Hex акцента для dark hover-glow: цвет бордера/статуса карточки. */
export function resolveTaskCardHoverGlowColor(input: {
  isDark: boolean;
  isLocalCommentDraft: boolean;
  isLocalDiagramCard: boolean;
  isLocalImageCard: boolean;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  stickyNoteColor?: string | null;
  task: Pick<Task, 'originalStatus' | 'statusColorKey'>;
}): string | undefined {
  if (!input.isDark) {
    return undefined;
  }
  if (input.isLocalCommentDraft) {
    return getStickyNotePaint(input.stickyNoteColor, true).border;
  }
  if (input.isLocalDiagramCard) {
    return String(getDiagramCardDeleteButtonStyle(true).borderColor ?? '#4c4890');
  }
  if (input.isLocalImageCard) {
    return String(getPhotoCardDeleteButtonStyle(true).borderColor ?? '#5c6368');
  }
  return getPhaseLinkArrowDefaultHex(
    input.phaseCardColorScheme,
    input.task.originalStatus,
    input.task.statusColorKey
  );
}

export function withTaskCardHoverGlowStyle(
  style: CSSProperties | undefined,
  glowColor: string | undefined
): CSSProperties | undefined {
  if (!glowColor) {
    return style;
  }
  return {
    ...style,
    ...({ [TASK_CARD_GLOW_CSS_VAR]: glowColor } as CSSProperties),
  };
}

export function buildTaskCardRingClasses(
  isSelected: boolean,
  isContextMenuOpen: boolean,
  isNotificationFocused = false
): string {
  if (isNotificationFocused && !isContextMenuOpen) {
    return 'ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-1 dark:ring-offset-gray-800 shadow-lg';
  }
  if (isSelected && !isContextMenuOpen) {
    return 'ring-2 ring-blue-600 dark:ring-blue-500 ring-offset-1 dark:ring-offset-gray-800 shadow-lg';
  }
  return '';
}

const CONTEXT_MENU_OUTLINE_BASE = ' outline outline-1 outline-offset-0';

/**
 * Синяя рамка «карточка с открытым меню».
 * У заметки/задачи уже есть border — достаточно сменить цвет.
 * У фото/схемы (borderWidth: 0) рисуем outline снаружи, чтобы контент не прыгал.
 * Outline держим и в закрытом состоянии (прозрачный), чтобы цвет мог плавно перейти.
 */
export function resolveTaskCardContextMenuBorderClasses(
  isContextMenuOpen: boolean,
  useOutline = false
): string {
  if (useOutline) {
    const color = isContextMenuOpen
      ? 'outline-blue-500 dark:outline-blue-400'
      : 'outline-transparent';
    return `${CONTEXT_MENU_OUTLINE_BASE} ${color}`;
  }
  if (!isContextMenuOpen) {
    return '';
  }
  return ' !border-blue-500 dark:!border-blue-400';
}

export function resolveTaskCardQaStripedStyle(params: {
  isQATask: boolean;
  qaStripedStyle?: CSSProperties;
  showExtraSplit: boolean;
  variant: TaskCardVariant;
}): CSSProperties | undefined {
  if (params.showExtraSplit && params.variant === 'sidebar') return undefined;
  return params.isQATask ? params.qaStripedStyle : undefined;
}
