import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant } from '@/types';

import { TEAM_TEXT_COLORS } from '@/constants';
import { getStickyNotePlaceholderTextClass } from '@/features/comments/utils/stickyNoteSurfaceClasses';
import { getStatusColors, resolveStatusForPhaseCardColors } from '@/utils/statusColors';

import { isSwimlaneSingleTimeslotWidth } from '../taskCardLayoutHelpers';

type Translate = (key: string, params?: Record<string, string>) => string;

export function resolveTaskCardTeamTextColor(
  task: Task,
  phaseCardColorScheme: PlanningPhaseCardColorScheme
): string {
  const statusForTitle = resolveStatusForPhaseCardColors(
    phaseCardColorScheme,
    task.originalStatus,
    task.statusColorKey
  );
  const statusColors = getStatusColors(statusForTitle);
  if (task.localDraftKind === 'comment' || task.localDraftKind === 'diagram' || task.localDraftKind === 'image') {
    return '';
  }
  if (task.isLocalTask) {
    return 'text-blue-600 dark:text-blue-300';
  }
  return `${statusColors.text || TEAM_TEXT_COLORS[task.team] || 'text-gray-900'} ${statusColors.textDark || ''}`;
}

export function resolveTaskCardDisplayId(task: Task): string {
  return task.originalTaskId || task.id;
}

/** Extra space so glyph descenders are not clipped by the overflow box. */
const TASK_CARD_TITLE_DESCENDER_RESERVE_PX = 2;
const TASK_CARD_TITLE_FIT_EPSILON_PX = 0.5;
const TITLE_LINE_CLAMP_PROBE_MAX = 8;
/** Probe far above any card so truncated titles still overflow the wrapper. */
const TITLE_OVERFLOW_UNCLAMP_PROBE_LINES = 32;

export const TASK_CARD_TITLE_DATA_ATTR = 'data-task-card-title';
export const TASK_CARD_TITLE_OVERFLOW_DATA_ATTR = 'data-task-card-title-overflows';

/** Fallback clamp before the title wrapper has been measured. */
const TITLE_DEFAULT_MAX_LINES = 3;
/** One-timeslot cards hide parent/meta, so the title can use more of the card. */
const TITLE_SINGLE_TIMESLOT_MAX_LINES_FALLBACK = 5;

export function resolveTaskCardTitleMaxLinesFallback(packed: boolean): number {
  return packed ? TITLE_SINGLE_TIMESLOT_MAX_LINES_FALLBACK : TITLE_DEFAULT_MAX_LINES;
}

export function doesTaskCardTitleLineCountOverflow(input: {
  availableHeight: number;
  descenderReservePx: number;
  measuredBoxHeight: number;
  measuredScrollHeight: number;
}): boolean {
  const fitHeight = input.availableHeight - input.descenderReservePx;
  return (
    input.measuredScrollHeight > input.availableHeight + TASK_CARD_TITLE_FIT_EPSILON_PX
    || input.measuredBoxHeight > fitHeight + TASK_CARD_TITLE_FIT_EPSILON_PX
  );
}

/** Highest line count that still fits; `overflowsAt` must be monotonic. */
export function resolveTaskCardFittedLineCount(input: {
  overflowsAt: (lines: number) => boolean;
  probeMaxLines: number;
}): number {
  const hiStart = Math.max(1, input.probeMaxLines);
  let best = 1;
  let lo = 1;
  let hi = hiStart;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (input.overflowsAt(mid)) {
      hi = mid - 1;
    } else {
      best = mid;
      lo = mid + 1;
    }
  }
  return best;
}

function resolveTaskCardTitleClampTarget(textEl: HTMLElement): HTMLElement {
  if (textEl.style.webkitLineClamp || getComputedStyle(textEl).display === '-webkit-box') {
    return textEl;
  }
  const child = textEl.firstElementChild;
  return child instanceof HTMLElement ? child : textEl;
}

function probeTaskCardTitleOverflowAtLineCount(
  wrapper: HTMLElement,
  clampTarget: HTMLElement,
  lines: number
): boolean {
  clampTarget.style.display = '-webkit-box';
  clampTarget.style.overflow = 'hidden';
  clampTarget.style.setProperty('-webkit-box-orient', 'vertical');
  clampTarget.style.webkitLineClamp = String(Math.max(1, lines));
  return doesTaskCardTitleLineCountOverflow({
    availableHeight: wrapper.clientHeight,
    descenderReservePx: TASK_CARD_TITLE_DESCENDER_RESERVE_PX,
    measuredBoxHeight: clampTarget.getBoundingClientRect().height,
    measuredScrollHeight: wrapper.scrollHeight,
  });
}

export function resolveTaskCardTitleProbeMaxLines(
  availableHeight: number,
  lineHeight: number
): number {
  if (!lineHeight || Number.isNaN(lineHeight) || availableHeight <= 0) {
    return TITLE_LINE_CLAMP_PROBE_MAX;
  }
  return Math.min(
    TITLE_LINE_CLAMP_PROBE_MAX,
    Math.max(1, Math.ceil(availableHeight / lineHeight) + 1)
  );
}

/** Live layout fit: apply clamp probes and keep the largest count that does not overflow. */
export function syncTaskCardTitleFittedLineCount(input: {
  textEl: HTMLElement;
  wrapperEl: HTMLElement;
}): number | null {
  if (input.textEl instanceof HTMLTextAreaElement) return null;
  if (input.wrapperEl.clientHeight <= 0) return null;
  const clampTarget = resolveTaskCardTitleClampTarget(input.textEl);
  const previousClamp = clampTarget.style.webkitLineClamp;
  const lineHeight = Number.parseFloat(getComputedStyle(clampTarget).lineHeight);
  const fitted = resolveTaskCardFittedLineCount({
    overflowsAt: (lines) =>
      probeTaskCardTitleOverflowAtLineCount(input.wrapperEl, clampTarget, lines),
    probeMaxLines: resolveTaskCardTitleProbeMaxLines(input.wrapperEl.clientHeight, lineHeight),
  });
  clampTarget.style.webkitLineClamp = previousClamp;
  return fitted;
}

/** True when the full title is taller than the current card, so hover-expand can reveal it. */
export function doesTaskCardTitleTextOverflow(input: {
  textEl: HTMLElement;
  wrapperEl: HTMLElement;
}): boolean {
  if (input.textEl instanceof HTMLTextAreaElement) return false;
  if (input.wrapperEl.clientHeight <= 0) return false;
  const clampTarget = resolveTaskCardTitleClampTarget(input.textEl);
  const previousClamp = clampTarget.style.webkitLineClamp;
  try {
    return probeTaskCardTitleOverflowAtLineCount(
      input.wrapperEl,
      clampTarget,
      TITLE_OVERFLOW_UNCLAMP_PROBE_LINES
    );
  } finally {
    clampTarget.style.webkitLineClamp = previousClamp;
  }
}

export function syncTaskCardTitleOverflowFlag(input: {
  textEl: HTMLElement;
  wrapperEl: HTMLElement;
}): void {
  input.textEl.setAttribute(
    TASK_CARD_TITLE_OVERFLOW_DATA_ATTR,
    doesTaskCardTitleTextOverflow(input) ? 'true' : 'false'
  );
}

export function isTaskCardTitleOverflowFlagSet(root: HTMLElement | null): boolean {
  return root?.getAttribute(TASK_CARD_TITLE_OVERFLOW_DATA_ATTR) === 'true';
}

export function adjustTaskCardTitleEditorHeight(
  textarea: HTMLTextAreaElement | null,
  wrapper: HTMLDivElement | null
): void {
  if (!textarea || !wrapper) return;
  textarea.style.height = '0px';
  const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 16;
  const maxHeight = Math.max(lineHeight, wrapper.clientHeight);
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
}

export function shouldPreventLinkNavigation(isDragging: boolean, hasMoved: boolean): boolean {
  return isDragging || hasMoved;
}

export function hasLinkDragMoved(
  mouseDownPos: { x: number; y: number } | null,
  clientX: number,
  clientY: number
): boolean {
  if (!mouseDownPos) return false;
  const deltaX = Math.abs(clientX - mouseDownPos.x);
  const deltaY = Math.abs(clientY - mouseDownPos.y);
  return deltaX > 5 || deltaY > 5;
}

export function mergeSwimlaneCardFields(
  swimlaneCardFields: SwimlaneCardFieldsVisibility | undefined
): SwimlaneCardFieldsVisibility {
  return {
    showParent: true,
    showKey: true,
    showPriority: true,
    showType: true,
    showEstimates: true,
    showSeverity: true,
    showStatus: true,
    ...swimlaneCardFields,
  };
}

export function resolveTaskCardSwimlaneMetaVisibility(input: {
  displayDuration: number;
  mergedFields: SwimlaneCardFieldsVisibility;
  task: Task;
}) {
  const hideTrackerMeta =
    input.task.isLocalTask === true ||
    input.task.localDraftKind === 'comment' ||
    input.task.localDraftKind === 'diagram' ||
    input.task.localDraftKind === 'image';
  const hideCompactMeta = isSwimlaneSingleTimeslotWidth(input.displayDuration);
  const showKey = hideTrackerMeta ? false : input.mergedFields.showKey;
  const showType = hideTrackerMeta || hideCompactMeta ? false : input.mergedFields.showType;
  const showPriorityIcon = Boolean(
    !hideCompactMeta && input.mergedFields.showPriority && input.task.priority
  );
  const showTypeIcon = Boolean(showType && input.task.type);
  const showMetaIcons = showPriorityIcon || showTypeIcon;

  return {
    showKey,
    showMetaIcons,
    showPriorityIcon,
    showTypeIcon,
  };
}

export function resolveTaskCardSwimlaneContentWrapperClass(input: {
  centerTitle: boolean;
  isCommentCard: boolean;
}): string {
  if (input.isCommentCard) {
    return 'relative h-full min-h-0 flex-1 overflow-hidden';
  }
  if (input.centerTitle) {
    return 'relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden';
  }
  return 'relative flex min-h-0 flex-1 flex-col justify-start overflow-hidden';
}

/** Title grows at four real timeslots; hover-expand must not change the font. */
export function resolveSwimlaneDisplayModes(durationParts: number): {
  lineHeightClass: string;
  textSize: string;
} {
  return {
    lineHeightClass: 'leading-tight',
    textSize: durationParts < 4 ? 'text-[10px]' : 'text-xs',
  };
}

export function buildTaskCardKeyLinkProps(input: {
  displayId: string;
  isDragging: boolean;
  onKeyLinkClick: (e: React.MouseEvent) => void;
  onLinkMouseDown: (e: React.MouseEvent) => void;
  onLinkMouseMove: (e: React.MouseEvent) => void;
  onLinkPointerDown: (e: React.PointerEvent) => void;
  t: Translate;
  trackerUrl: string;
}) {
  return {
    href: input.trackerUrl,
    rel: 'noopener noreferrer' as const,
    target: '_blank' as const,
    title: input.t('task.card.openInTracker', { id: input.displayId }),
    style: { pointerEvents: input.isDragging ? ('none' as const) : ('auto' as const) },
    onClick: input.onKeyLinkClick,
    onMouseDown: input.onLinkMouseDown,
    onMouseMove: input.onLinkMouseMove,
    onPointerDown: input.onLinkPointerDown,
  };
}

export function resolveTaskCardTitlePlaceholderClass(isCommentDraft: boolean): string {
  return isCommentDraft ? getStickyNotePlaceholderTextClass() : 'font-bold opacity-50';
}

export function isQuickAddChooserDraft(
  task: Pick<Task, 'isLocalTask' | 'localDraftKind'>
): boolean {
  return task.isLocalTask === true && task.localDraftKind === undefined;
}

export function resolveQuickAddGhostPlaceholderKey(
  kind: Task['localDraftKind']
): string {
  if (kind === 'comment') {
    return 'sprintPlanner.swimlane.quickAddMenu.commentGhostPlaceholder';
  }
  if (kind === 'existing') {
    return 'sprintPlanner.swimlane.quickAddMenu.existingGhostPlaceholder';
  }
  if (kind === 'image') {
    return 'sprintPlanner.swimlane.quickAddMenu.imageEmptySlot';
  }
  return 'sprintPlanner.swimlane.quickAddMenu.titlePlaceholder';
}

export function resolveTaskCardTitleText(task: Task, t: Translate): React.ReactNode {
  if (task.isLocalTask && !task.name?.trim()) {
    const isCommentDraft = task.localDraftKind === 'comment';
    return (
      <span className={resolveTaskCardTitlePlaceholderClass(isCommentDraft)}>
        {t(resolveQuickAddGhostPlaceholderKey(task.localDraftKind))}
      </span>
    );
  }
  return task.name || t('task.card.untitled');
}

export function isSidebarTaskCardVariant(variant: TaskCardVariant): boolean {
  return variant === 'sidebar';
}
