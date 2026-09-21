'use client';

import type { Task, TaskPosition } from '@/types';

import { useContext, useEffect, useMemo, useState } from 'react';
import Xarrow from 'react-xarrows';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { ZIndex } from '@/constants';
import {
  buildOccupancySegmentArrowLinks,
  buildOccupancyDevToQaLinks,
  filterOccupancyUserTaskLinks,
  getOccupancyRowTaskIds,
  getOccupancyTaskPositionsSignature,
} from '@/features/sprint/components/SprintPlanner/occupancy/utils/task-arrows/occupancyTaskArrowsHelpers';
import { LinkArrowDeleteHandles } from '@/features/swimlane/components/task-arrows/LinkArrowDeleteHandles';
import { TaskArrowLayer } from '@/features/swimlane/components/task-arrows/TaskArrowLayer';
import {
  resolveTaskLinkArrowHeadProps,
  resolveTaskLinkArrowPaintColor,
  TASK_LINK_ARROW_HEAD_SHAPE,
  TASK_LINK_ARROW_HEAD_SIZE,
} from '@/features/swimlane/components/task-arrows/taskArrowLinkHelpers';
import { collectTimelineHoverLinkedTaskIds } from '@/features/swimlane/utils/task-arrows/collectTimelinePredecessorTaskIds';
import { bindLinkDeleteHandler } from '@/features/swimlane/utils/task-arrows/linkArrowDeleteHandleHelpers';
import { filterTaskLinksForSegmentEdit } from '@/features/swimlane/utils/task-arrows/taskArrowsHelpers';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { DELAYS } from '@/utils/constants';
import { getPhaseLinkArrowDefaultHex } from '@/utils/statusColors';

import { OccupancyArrowRedrawContext } from '../../OccupancyArrowRedrawContext';
import { useOccupancyArrowsVisibleIds } from '../../OccupancyArrowsVisibilityCtx';

import {
  isOccupancyDevQaLink,
  occupancyArrowEndpointsAreOnBoard,
  resolveOccupancyTaskArrowEndpoints,
} from './occupancyTaskArrowsRenderHelpers';
import { OccupancyTaskLinkArrow } from './OccupancyTaskLinkArrow';

interface OccupancyTaskArrowsProps {
  devToQaTaskId: Map<string, string>;
  hoveredPhaseTaskId: string | null;
  /** Режим добавления связи — без подсветки стрелок от ховера фаз и без ховера для удаления. */
  linkingFromTaskId?: string | null;
  /** ID задачи в режиме редактирования отрезков — связи с этой задачей не показываем */
  segmentEditTaskId?: string | null;
  taskIdsOrder: string[];
  taskLinks: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  taskPositions: Map<string, TaskPosition>;
  tasksMap: Map<string, Task>;
  onDeleteLink?: (linkId: string) => void;
}

export function OccupancyTaskArrows({
  devToQaTaskId,
  hoveredPhaseTaskId,
  linkingFromTaskId = null,
  segmentEditTaskId = null,
  taskLinks,
  taskIdsOrder,
  taskPositions,
  tasksMap,
  onDeleteLink,
}: OccupancyTaskArrowsProps) {
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const isDark = useDocumentDarkClass();
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const effectiveHoveredLinkId = linkingFromTaskId != null ? null : hoveredLinkId;
  const requestArrowRedraw = useContext(OccupancyArrowRedrawContext);
  const visibleIdsCtx = useOccupancyArrowsVisibleIds();
  const positionsSignature = useMemo(
    () => getOccupancyTaskPositionsSignature(taskPositions),
    [taskPositions]
  );

  const visibleTaskIdsRef = visibleIdsCtx?.visibleTaskIds;
  const visibleSignature = visibleTaskIdsRef
    ? Array.from(visibleTaskIdsRef).sort().join(',')
    : '';
  const linksSignature = taskLinks.map((link) => link.id).join('|');

  useEffect(() => {
    if (!requestArrowRedraw) return;
    const frame = requestAnimationFrame(() => requestArrowRedraw());
    const delayed = window.setTimeout(() => requestArrowRedraw(), DELAYS.ARROW_UPDATE);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
    };
  }, [linksSignature, positionsSignature, segmentEditTaskId, visibleSignature, requestArrowRedraw]);


  const userLinks = filterOccupancyUserTaskLinks(taskLinks, taskIdsOrder, devToQaTaskId);
  const devToQALinks = buildOccupancyDevToQaLinks(
    devToQaTaskId,
    taskPositions,
    taskIdsOrder
  );

  const allLinksRaw = [...userLinks, ...devToQALinks];
  const allLinks = filterTaskLinksForSegmentEdit(allLinksRaw, segmentEditTaskId);
  const segmentArrowLinks = buildOccupancySegmentArrowLinks(taskPositions, taskIdsOrder);

  const getRowTaskIds = useMemo(
    () => (taskId: string) =>
      getOccupancyRowTaskIds(taskId, devToQaTaskId, taskPositions, tasksMap),
    [devToQaTaskId, taskPositions, tasksMap]
  );

  const handleDeleteLink = bindLinkDeleteHandler(onDeleteLink, () => setHoveredLinkId(null));

  const hoverConnectedTaskIds =
    linkingFromTaskId == null && hoveredPhaseTaskId != null
      ? collectTimelineHoverLinkedTaskIds(hoveredPhaseTaskId, allLinks, taskPositions)
      : null;

  if (allLinks.length === 0 && segmentArrowLinks.length === 0) return null;

  const deleteHandles =
    linkingFromTaskId == null && handleDeleteLink
      ? allLinks
          .filter((link) => !isOccupancyDevQaLink(link.id))
          .flatMap((link) => {
            const endpoints = resolveOccupancyTaskArrowEndpoints(
              link,
              false,
              taskIdsOrder,
              taskPositions,
              getRowTaskIds
            );
            if (!occupancyArrowEndpointsAreOnBoard(endpoints, taskPositions)) {
              return [];
            }
            return [
              {
                fromTaskId: link.fromTaskId,
                id: link.id,
                startElementId: endpoints.startElement,
                toElementId: endpoints.endElement,
              },
            ];
          })
      : [];

  return (
    <>
      <TaskArrowLayer zIndex={ZIndex.contentOverlay}>
        {segmentArrowLinks.map((link) => {
          const task = tasksMap.get(link.taskId);
          const baseColor = getPhaseLinkArrowDefaultHex(
            phaseCardColorScheme,
            task?.originalStatus,
            task?.statusColorKey
          );
          const bothEndsVisible =
            visibleIdsCtx == null || visibleIdsCtx.visibleTaskIds.has(link.taskId);
          if (!bothEndsVisible) return null;

          const color = resolveTaskLinkArrowPaintColor(baseColor, false, isDark);
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
        {allLinks.map((link) => (
          <OccupancyTaskLinkArrow
            key={link.id}
            effectiveHoveredLinkId={effectiveHoveredLinkId}
            getRowTaskIds={getRowTaskIds}
            hoverConnectedTaskIds={hoverConnectedTaskIds}
            hoveredPhaseTaskId={hoveredPhaseTaskId}
            link={link}
            linkingFromTaskId={linkingFromTaskId}
            phaseCardColorScheme={phaseCardColorScheme}
            setHoveredLinkId={setHoveredLinkId}
            taskIdsOrder={taskIdsOrder}
            taskPositions={taskPositions}
            tasksMap={tasksMap}
            visibleTaskIds={visibleIdsCtx?.visibleTaskIds ?? null}
            onDeleteLink={handleDeleteLink}
          />
        ))}
      </TaskArrowLayer>
      {handleDeleteLink ? (
        <LinkArrowDeleteHandles
          handles={deleteHandles}
          hoveredLinkId={effectiveHoveredLinkId}
          hoveredSourceId={hoveredPhaseTaskId}
          onDelete={handleDeleteLink}
          onHoveredLinkIdChange={setHoveredLinkId}
        />
      ) : null}
    </>
  );
}
