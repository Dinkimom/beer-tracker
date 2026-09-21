import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { Task, TaskLink } from '@/types';
import type { svgCustomEdgeType } from 'react-xarrows';

import { createElement } from 'react';

import { isLinkInHoverConnectedComponent } from '@/features/swimlane/utils/task-arrows/collectTimelinePredecessorTaskIds';
import { TASK_ARROWS_DEV_QA_LINK_PREFIX } from '@/features/swimlane/utils/task-arrows/taskArrowsHelpers';
import {
  DEFAULT_NEAREST_SIDE_ANCHORS,
  resolveNearestSideAnchors,
  type XarrowAnchorSpec,
} from '@/utils/nearestSideAnchors';
import { getPhaseLinkArrowDefaultHex } from '@/utils/statusColors';

/**
 * Открытый шеврон со скруглёнными концами (не острый залитый треугольник).
 * offsetForward у вершины — тело доходит до кончика без дыры.
 */
export const TASK_LINK_ARROW_HEAD_SIZE = 4;

/** Как у затемнения карточек (`opacity 0.2s ease`) — stroke/fill стрелок. */
const TASK_LINK_ARROW_COLOR_TRANSITION = 'stroke 0.2s ease, fill 0.2s ease';

/** Ортогональная трасса (прямые углы) вместо плавной кривой. */
export const TASK_LINK_ARROW_PATH = 'grid' as const;

/** Доля нейтрали в idle (без alpha). Dark чуть сильнее light, но не в фон. */
const TASK_LINK_ARROW_IDLE_MUTE_MIX_LIGHT = 0.72;
const TASK_LINK_ARROW_IDLE_MUTE_MIX_DARK = 0.68;
const TASK_LINK_ARROW_MUTE_TOWARD_LIGHT = '#e5e7eb';
const TASK_LINK_ARROW_MUTE_TOWARD_DARK = '#374151';

const TASK_LINK_ARROW_HEAD_TIP_X = 0.82;
const TASK_LINK_ARROW_HEAD_PATH = `M 0.14 0.08 L ${TASK_LINK_ARROW_HEAD_TIP_X} 0.5 L 0.14 0.92`;

export const TASK_LINK_ARROW_HEAD_SHAPE: svgCustomEdgeType = {
  offsetForward: TASK_LINK_ARROW_HEAD_TIP_X,
  svgElem: createElement('path', {
    d: TASK_LINK_ARROW_HEAD_PATH,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 0.26,
  }),
};

function parseHexRgb(hex: string): { b: number; g: number; r: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Смешивает два hex; `amountTowardB` = 0..1. */
export function mixHexColors(hexA: string, hexB: string, amountTowardB: number): string {
  const a = parseHexRgb(hexA);
  const b = parseHexRgb(hexB);
  if (!a || !b) return hexA;
  const t = Math.min(1, Math.max(0, amountTowardB));
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

function isDocumentDarkClass(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/**
 * Непрозрачный цвет стрелки: idle — приглушённый mix с нейтралью (без rgba),
 * emphasized — полный базовый цвет (hover-кластер / удаление).
 */
export function resolveTaskLinkArrowPaintColor(
  baseHex: string,
  emphasized: boolean,
  isDark: boolean = isDocumentDarkClass()
): string {
  if (emphasized) return baseHex;
  const toward = isDark ? TASK_LINK_ARROW_MUTE_TOWARD_DARK : TASK_LINK_ARROW_MUTE_TOWARD_LIGHT;
  const mix = isDark ? TASK_LINK_ARROW_IDLE_MUTE_MIX_DARK : TASK_LINK_ARROW_IDLE_MUTE_MIX_LIGHT;
  return mixHexColors(baseHex, toward, mix);
}

export function resolveTaskLinkArrowHeadProps(color: string): {
  fill: 'none';
  stroke: string;
  style: { transition: string };
} {
  return {
    fill: 'none',
    stroke: color,
    style: { transition: TASK_LINK_ARROW_COLOR_TRANSITION },
  };
}

/** Плавная смена цвета тела стрелки при hover-кластере. */
export function resolveTaskLinkArrowBodyProps(): {
  style: { transition: string };
} {
  return { style: { transition: TASK_LINK_ARROW_COLOR_TRANSITION } };
}

export function resolveTaskArrowLinkColor(params: {
  canDelete: boolean;
  fromTask: Task | undefined;
  isHovered: boolean;
  isRelatedToHoveredTask: boolean;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
}): string {
  const baseColor =
    params.isHovered && params.canDelete
      ? '#ef4444'
      : getPhaseLinkArrowDefaultHex(
          params.phaseCardColorScheme,
          params.fromTask?.originalStatus,
          params.fromTask?.statusColorKey
        );
  const emphasized = params.isHovered || params.isRelatedToHoveredTask;
  return resolveTaskLinkArrowPaintColor(baseColor, emphasized);
}

export function resolveNearestAnchorsForElementIds(
  fromElementId: string,
  toElementId: string,
  /** При смене generation (redraw) caller пересчитывает якоря по актуальному DOM. */
  _layoutGeneration?: number
): { endAnchor: XarrowAnchorSpec; startAnchor: XarrowAnchorSpec } {
  if (typeof document === 'undefined') {
    return {
      startAnchor: DEFAULT_NEAREST_SIDE_ANCHORS.fromAnchor,
      endAnchor: DEFAULT_NEAREST_SIDE_ANCHORS.toAnchor,
    };
  }

  const fromEl = document.getElementById(fromElementId);
  const toEl = document.getElementById(toElementId);
  if (!fromEl || !toEl) {
    return {
      startAnchor: DEFAULT_NEAREST_SIDE_ANCHORS.fromAnchor,
      endAnchor: DEFAULT_NEAREST_SIDE_ANCHORS.toAnchor,
    };
  }

  const anchors = resolveNearestSideAnchors(
    fromEl.getBoundingClientRect(),
    toEl.getBoundingClientRect()
  );
  return { startAnchor: anchors.fromAnchor, endAnchor: anchors.toAnchor };
}

export function resolveTaskArrowNearestAnchors(
  fromTaskId: string,
  toTaskId: string,
  layoutGeneration?: number
): { endAnchor: XarrowAnchorSpec; startAnchor: XarrowAnchorSpec } {
  return resolveNearestAnchorsForElementIds(
    `task-${fromTaskId}`,
    `task-${toTaskId}`,
    layoutGeneration
  );
}

export function isTaskArrowLinkRelatedToHoveredTask(
  hoveredTaskIdForArrows: string | null,
  link: TaskLink,
  hoverConnectedTaskIds: Set<string> | null = null
): boolean {
  return isLinkInHoverConnectedComponent(
    hoverConnectedTaskIds,
    hoveredTaskIdForArrows,
    link
  );
}

export function isDevQaTaskArrowLink(linkId: string): boolean {
  return linkId.startsWith(TASK_ARROWS_DEV_QA_LINK_PREFIX);
}
