'use client';

import type { Task, TaskLink, TaskPosition } from '@/types';

import { observer } from 'mobx-react-lite';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useXarrow } from 'react-xarrows';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { ZIndex } from '@/constants';
import { useLinkPreviewCursor } from '@/features/swimlane/hooks/useLinkPreviewCursor';
import { SwimlaneArrowRedrawContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import {
  resolveSwimlaneLinkPreviewTargetId,
  shouldShowSwimlaneLinkDeleteHandles,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { bindLinkDeleteHandler } from '@/features/swimlane/utils/task-arrows/linkArrowDeleteHandleHelpers';
import { buildSwimlaneSegmentArrowLinks } from '@/features/swimlane/utils/task-arrows/swimlaneSegmentArrowHelpers';
import {
  buildTasksMapById,
  filterTaskLinksByPlacedEndpoints,
  filterTaskLinksByVisibleDevelopers,
  filterTaskLinksForActiveDrag,
  filterTaskLinksForSegmentEdit,
  getSwimlaneTaskPositionsSignature,
  getSwimlaneVisibleAssigneesSignature,
  mergeTaskLinksWithDevQa,
  partitionTaskArrowLinks,
} from '@/features/swimlane/utils/task-arrows/taskArrowsHelpers';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { DELAYS } from '@/utils/constants';
import { resolveLinkArrowDrawTaskIds } from '@/utils/linkAnchors';

import { LinkArrowDeleteHandles } from './LinkArrowDeleteHandles';
import { SwimlaneLinkPreviewArrow } from './SwimlaneLinkPreviewArrow';
import { TaskArrowLayer } from './TaskArrowLayer';
import { TaskArrowLink } from './TaskArrowLink';
import { isDevQaTaskArrowLink } from './taskArrowLinkHelpers';
import { TaskSegmentArrowLinks } from './TaskSegmentArrowLinks';

interface TaskArrowsProps {
  activeTaskId?: string | null;
  hoveredTaskId?: string | null;
  /** Источник рисуемой связи (превью линии). */
  linkingFromTaskId?: string | null;
  /** Режим «Связь»: подсветка и превью без ховер-крестиков. */
  linkingSessionActive?: boolean;
  /** Капсула «Связь»: крестики удаления всех пользовательских связей. */
  linkToolArmed?: boolean;
  /** Dev task id → QA task. Если передан, рисуются стрелки от задачи разработки к задаче тестирования. */
  qaTasksMap?: Map<string, Task>;
  /** Задача в режиме редактирования отрезков — связи с ней скрываем (как в занятости). */
  segmentEditTaskId?: string | null;
  /** Связи между задачами (в т.ч. пользовательские) */
  taskLinks: TaskLink[];
  taskPositions?: Map<string, TaskPosition>;
  tasks: Task[];
  visibleDeveloperIds?: Set<string>;
  onDeleteLink?: (linkId: string) => void;
  onTaskHoverEnd?: () => void;
}

export const TaskArrows = observer(function TaskArrows({
  taskLinks,
  taskPositions,
  tasks,
  qaTasksMap,
  activeTaskId = null,
  hoveredTaskId = null,
  linkingFromTaskId = null,
  linkingSessionActive = false,
  linkToolArmed = false,
  segmentEditTaskId = null,
  visibleDeveloperIds,
  onDeleteLink,
  onTaskHoverEnd,
}: TaskArrowsProps) {
  useDocumentDarkClass();
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const updateXarrow = useXarrow();
  const requestArrowRedraw = useContext(SwimlaneArrowRedrawContext);
  const redrawArrows = requestArrowRedraw ?? updateXarrow;
  const linkModeActive = linkingSessionActive || linkingFromTaskId != null;
  const showToolbarLinkDeleteHandles = shouldShowSwimlaneLinkDeleteHandles(linkToolArmed);
  const cursorPos = useLinkPreviewCursor(linkingFromTaskId != null);
  const positionsSignature = getSwimlaneTaskPositionsSignature(taskPositions);
  const visibleAssigneesSignature = getSwimlaneVisibleAssigneesSignature(visibleDeveloperIds);

  const tasksMap = buildTasksMapById(tasks);

  const allLinks = mergeTaskLinksWithDevQa(taskLinks, qaTasksMap, taskPositions);

  let visibleLinks = filterTaskLinksByPlacedEndpoints(allLinks, taskPositions);
  visibleLinks = filterTaskLinksForActiveDrag(visibleLinks, activeTaskId);
  visibleLinks = filterTaskLinksForSegmentEdit(visibleLinks, segmentEditTaskId);

  if (visibleDeveloperIds) {
    visibleLinks = filterTaskLinksByVisibleDevelopers(
      visibleLinks,
      tasksMap,
      taskPositions,
      visibleDeveloperIds
    );
  }

  const visibleLinkIdsKey = visibleLinks.map((link) => link.id).join('|');
  useEffect(() => {
    const frame = requestAnimationFrame(() => redrawArrows());
    const delayed = window.setTimeout(() => redrawArrows(), DELAYS.ARROW_UPDATE);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
    };
  }, [redrawArrows, visibleLinkIdsKey, positionsSignature, visibleAssigneesSignature]);

  const handleDeleteLink = bindLinkDeleteHandler(onDeleteLink, () => setHoveredLinkId(null));

  const excludeSegmentArrowTaskIds = useMemo(() => {
    const ids = new Set<string>();
    if (activeTaskId) ids.add(activeTaskId);
    if (segmentEditTaskId) ids.add(segmentEditTaskId);
    return ids.size > 0 ? ids : null;
  }, [activeTaskId, segmentEditTaskId]);

  const segmentArrowLinks = buildSwimlaneSegmentArrowLinks(taskPositions, {
    excludeTaskIds: excludeSegmentArrowTaskIds,
    tasksMap,
    visibleDeveloperIds,
  });

  const effectiveHoveredLinkId = linkModeActive ? hoveredLinkId : null;
  const hoveredTaskIdForArrows = linkModeActive ? null : hoveredTaskId;
  const { hoverConnectedTaskIds, hoveredLink, hoveredTaskLinks, regularLinks } =
    partitionTaskArrowLinks(
      visibleLinks,
      effectiveHoveredLinkId,
      hoveredTaskIdForArrows ?? null,
      taskPositions
    );

  const previewTargetId =
    linkingFromTaskId != null && taskPositions
      ? resolveSwimlaneLinkPreviewTargetId({
          hoveredTaskId,
          linkingFromTaskId,
          taskLinks,
          taskPositions,
        })
      : null;

  const deleteHandles =
    showToolbarLinkDeleteHandles && handleDeleteLink
      ? visibleLinks
          .filter((link) => !isDevQaTaskArrowLink(link.id))
          .map((link) => {
            const { startTaskId, endTaskId } = resolveLinkArrowDrawTaskIds(
              link.fromTaskId,
              link.toTaskId,
              taskPositions
            );
            return {
              fromTaskId: link.fromTaskId,
              id: link.id,
              startElementId: `task-${startTaskId}`,
              toElementId: `task-${endTaskId}`,
            };
          })
      : [];

  const linkProps = {
    arrowPointerEventsEnabled: false,
    hoverConnectedTaskIds,
    hoveredLinkId: effectiveHoveredLinkId,
    hoveredTaskIdForArrows: hoveredTaskIdForArrows ?? null,
    onDeleteLink: linkModeActive ? handleDeleteLink : undefined,
    onHoveredLinkIdChange: setHoveredLinkId,
    phaseCardColorScheme,
    taskPositions,
    tasksMap,
  };

  return (
    <>
      <TaskSegmentArrowLinks links={segmentArrowLinks} tasksMap={tasksMap} />
      {/* Один слой: related не remount'ятся — иначе CSS transition цвета не сработает. */}
      <TaskArrowLayer zIndex={ZIndex.contentOverlay}>
        {[...regularLinks, ...hoveredTaskLinks].map((link) => (
          <TaskArrowLink key={link.id} {...linkProps} link={link} />
        ))}
      </TaskArrowLayer>
      {hoveredLink && (
        <TaskArrowLayer zIndex={ZIndex.arrowsHovered}>
          <TaskArrowLink {...linkProps} link={hoveredLink} />
        </TaskArrowLayer>
      )}
      {linkingFromTaskId != null ? (
        <SwimlaneLinkPreviewArrow
          cursorPos={cursorPos}
          linkingFromTaskId={linkingFromTaskId}
          previewTargetId={previewTargetId}
        />
      ) : null}
      {handleDeleteLink ? (
        <LinkArrowDeleteHandles
          handles={deleteHandles}
          hoveredLinkId={effectiveHoveredLinkId}
          hoveredSourceId={hoveredTaskIdForArrows}
          showAll={showToolbarLinkDeleteHandles}
          onDelete={handleDeleteLink}
          onHoveredLinkIdChange={setHoveredLinkId}
          onSourceHoverEnd={onTaskHoverEnd}
        />
      ) : null}
    </>
  );
});
