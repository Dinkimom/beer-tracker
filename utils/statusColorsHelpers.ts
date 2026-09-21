import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';

import { DEFAULT_COLORS, STATUS_COLOR_MAP, type StatusColorGroup } from './statusColorsMap';

function normalizeStatusKey(status: string): string {
  return (status || '').toLowerCase().replace(/[\s_-]/g, '').trim();
}

function lookupStatusColors(status?: string): StatusColorGroup {
  if (!status) {
    return DEFAULT_COLORS;
  }
  return STATUS_COLOR_MAP[normalizeStatusKey(status)] || DEFAULT_COLORS;
}

interface ResizeHandleColorResult {
  bg: string;
  bgDark: string;
  /** Hover-бэкдроп: отдельные литералы для Tailwind JIT (не через `.replace('/60','/20')`). */
  hoverBg: string;
  hoverBgDark: string;
  line: string;
  lineDark: string;
}

/**
 * Active `/60` → hover `/20`. Значения hover должны быть полными строками в исходнике,
 * иначе Tailwind не сгенерирует классы (как у заметок — там inline rgba по той же причине).
 */
const RESIZE_HANDLE_HOVER_BG_BY_ACTIVE: Record<string, string> = {
  'bg-blue-200/60': 'bg-blue-200/20',
  'bg-brown-200/60': 'bg-brown-200/20',
  'bg-gray-200/60': 'bg-gray-200/20',
  'bg-green-200/60': 'bg-green-200/20',
  'bg-orange-200/60': 'bg-orange-200/20',
  'bg-pink-200/60': 'bg-pink-200/20',
  'bg-red-200/60': 'bg-red-200/20',
  'bg-violet-200/60': 'bg-violet-200/20',
  'bg-yellow-200/60': 'bg-yellow-200/20',
  'dark:bg-blue-700/60': 'dark:bg-blue-700/20',
  'dark:bg-brown-800/60': 'dark:bg-brown-800/20',
  'dark:bg-gray-600/60': 'dark:bg-gray-600/20',
  'dark:bg-green-700/60': 'dark:bg-green-700/20',
  'dark:bg-orange-700/60': 'dark:bg-orange-700/20',
  'dark:bg-pink-700/60': 'dark:bg-pink-700/20',
  'dark:bg-red-700/60': 'dark:bg-red-700/20',
  'dark:bg-violet-700/60': 'dark:bg-violet-700/20',
  'dark:bg-yellow-700/60': 'dark:bg-yellow-700/20',
};

export function resolveResizeHandleHoverBgClass(activeBgClass: string): string {
  if (!activeBgClass) return '';
  return RESIZE_HANDLE_HOVER_BG_BY_ACTIVE[activeBgClass] ?? activeBgClass;
}

function buildResizeHandleColorResult(statusColors: StatusColorGroup): ResizeHandleColorResult {
  const bg = statusColors.resizeHandle.bg;
  const bgDark = statusColors.resizeHandleDark?.bg || '';
  return {
    bg,
    bgDark,
    hoverBg: resolveResizeHandleHoverBgClass(bg),
    hoverBgDark: resolveResizeHandleHoverBgClass(bgDark),
    line: statusColors.resizeHandle.line,
    lineDark: statusColors.resizeHandleDark?.line || '',
  };
}

function isQaReviewStatus(normalizedStatus: string): boolean {
  return normalizedStatus === 'review' || normalizedStatus === 'inreview';
}

function resolveStatusColorsForResizeHandle(
  status: string | undefined,
  isQATask: boolean
): StatusColorGroup {
  if (!status) {
    return DEFAULT_COLORS;
  }
  const normalizedStatus = status.toLowerCase();
  if (isQATask && isQaReviewStatus(normalizedStatus)) {
    return lookupStatusColors('backlog');
  }
  return lookupStatusColors(status);
}

export function resolveResizeHandleColors(
  status: string | undefined,
  isQATask: boolean,
  scheme: PlanningPhaseCardColorScheme
): ResizeHandleColorResult {
  if (scheme === 'monochrome') {
    return buildResizeHandleColorResult(lookupStatusColors('backlog'));
  }
  return buildResizeHandleColorResult(resolveStatusColorsForResizeHandle(status, isQATask));
}
