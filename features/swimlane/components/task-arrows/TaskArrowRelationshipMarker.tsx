'use client';

import type { TaskLink, TaskPosition } from '@/types';

import { useContext, useEffect, useState } from 'react';
import Xarrow from 'react-xarrows';

import { useI18n } from '@/contexts/LanguageContext';
import { SwimlaneArrowRedrawGenerationContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import {
  groupTaskLinkRelationshipCaptions,
  mergeRelationshipMarkerPresence,
  taskLinkRelationshipChipWraps,
  type GroupedTaskLinkRelationshipCaption,
  type RelationshipMarkerPresenceItem,
} from '@/features/swimlane/utils/task-arrows/taskLinkRelationshipLabel';
import { OVERLAY_EXIT_DURATION_MS } from '@/hooks/useOverlayPresence';

import {
  isDevQaTaskArrowLink,
  resolveTaskArrowNearestAnchors,
  TASK_LINK_ARROW_PATH,
} from './taskArrowLinkHelpers';

interface TaskArrowRelationshipMarkerProps {
  links: TaskLink[];
  taskPositions: Map<string, TaskPosition> | undefined;
}

export function TaskArrowRelationshipMarker({
  links,
  taskPositions,
}: TaskArrowRelationshipMarkerProps) {
  const redrawGeneration = useContext(SwimlaneArrowRedrawGenerationContext);
  const { t } = useI18n();
  const groups = groupTaskLinkRelationshipCaptions({
    links: links.filter((link) => !isDevQaTaskArrowLink(link.id)),
    taskPositions,
    translate: t,
  });
  const shown = useRelationshipMarkerPresence(groups);
  if (shown.length === 0) {
    return null;
  }

  return (
    <>
      {shown.map((entry) => {
        const { startAnchor, endAnchor } = resolveTaskArrowNearestAnchors(
          entry.item.startTaskId,
          entry.item.endTaskId,
          redrawGeneration
        );
        return (
          <div key={entry.item.key} className="pointer-events-none">
            <Xarrow
              animateDrawing={false}
              color="transparent"
              dashness={false}
              divContainerProps={{ className: 'pointer-events-none' }}
              end={`task-${entry.item.endTaskId}`}
              endAnchor={endAnchor}
              gridRadius={0}
              labels={{ middle: relationshipChip(entry.item.captions, entry.exiting) }}
              path={TASK_LINK_ARROW_PATH}
              showHead={false}
              showTail={false}
              start={`task-${entry.item.startTaskId}`}
              startAnchor={startAnchor}
              strokeWidth={0}
            />
          </div>
        );
      })}
    </>
  );
}

const RELATIONSHIP_CHIP_CLASS =
  'task-link-relationship-chip pointer-events-none rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-center text-[10px] font-semibold leading-3 text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

function relationshipChip(captions: string[], exiting: boolean) {
  const label = captions[0] ?? '';
  const layout = taskLinkRelationshipChipWraps(label)
    ? 'block w-32 line-clamp-2'
    : 'whitespace-nowrap';
  return (
    <span
      key={exiting ? 'exit' : 'enter'}
      className={`${RELATIONSHIP_CHIP_CLASS} ${layout}`}
      data-state={exiting ? 'closed' : 'open'}
      data-task-link-relationship={label}
    >
      {label}
    </span>
  );
}

function useRelationshipMarkerPresence(groups: GroupedTaskLinkRelationshipCaption[]) {
  const [shown, setShown] = useState<RelationshipMarkerPresenceItem[]>([]);
  const merged = mergeRelationshipMarkerPresence(shown, groups, prefersReducedMotion());
  if (!sameRelationshipMarkerPresence(shown, merged)) {
    setShown(merged);
  }

  useEffect(() => {
    if (!shown.some((entry) => entry.exiting)) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      setShown((current) => current.filter((entry) => !entry.exiting));
    }, OVERLAY_EXIT_DURATION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shown]);

  return shown;
}

function sameRelationshipMarkerPresence(
  left: readonly RelationshipMarkerPresenceItem[],
  right: readonly RelationshipMarkerPresenceItem[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((entry, index) => {
    const other = right[index];
    return (
      other != null &&
      entry.exiting === other.exiting &&
      entry.item.key === other.item.key &&
      entry.item.captions[0] === other.item.captions[0] &&
      entry.item.startTaskId === other.item.startTaskId &&
      entry.item.endTaskId === other.item.endTaskId
    );
  });
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
