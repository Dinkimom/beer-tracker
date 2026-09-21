'use client';

import type { SwimlaneSegmentArrowLink } from '@/features/swimlane/utils/task-arrows/swimlaneSegmentArrowHelpers';
import type { Task } from '@/types';

import { useContext, useLayoutEffect } from 'react';
import Xarrow from 'react-xarrows';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { ZIndex } from '@/constants';
import {
  SwimlaneArrowRedrawContext,
  SwimlaneArrowRedrawGenerationContext,
} from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { getPhaseLinkArrowDefaultHex } from '@/utils/statusColors';

import {
  resolveTaskLinkArrowHeadProps,
  resolveTaskLinkArrowPaintColor,
  TASK_LINK_ARROW_HEAD_SHAPE,
  TASK_LINK_ARROW_HEAD_SIZE,
} from './taskArrowLinkHelpers';

interface TaskSegmentArrowLinksProps {
  links: SwimlaneSegmentArrowLink[];
  tasksMap: Map<string, Task>;
}

/** Пунктирные стрелки между соседними отрезками плана одной задачи. */
export function TaskSegmentArrowLinks({ links, tasksMap }: TaskSegmentArrowLinksProps) {
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const isDark = useDocumentDarkClass();
  const requestArrowRedraw = useContext(SwimlaneArrowRedrawContext);
  const redrawGeneration = useContext(SwimlaneArrowRedrawGenerationContext);
  const linksKey = links.map((l) => l.id).join('|');

  useLayoutEffect(() => {
    if (!requestArrowRedraw || linksKey.length === 0) return;
    const id = requestAnimationFrame(() => requestArrowRedraw());
    return () => cancelAnimationFrame(id);
  }, [linksKey, requestArrowRedraw, redrawGeneration]);

  if (links.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: ZIndex.contentOverlay }}
    >
      {links.map((link) => {
        const task = tasksMap.get(link.taskId);
        const hex = getPhaseLinkArrowDefaultHex(
          phaseCardColorScheme,
          task?.originalStatus,
          task?.statusColorKey
        );
        const color = resolveTaskLinkArrowPaintColor(hex, false, isDark);
        return (
          <Xarrow
            key={link.id}
            animateDrawing={false}
            arrowHeadProps={resolveTaskLinkArrowHeadProps(color)}
            color={color}
            curveness={0.3}
            dashness
            end={link.endElement}
            endAnchor="left"
            headShape={TASK_LINK_ARROW_HEAD_SHAPE}
            headSize={TASK_LINK_ARROW_HEAD_SIZE}
            path="smooth"
            start={link.startElement}
            startAnchor="right"
            strokeWidth={2}
          />
        );
      })}
    </div>
  );
}
