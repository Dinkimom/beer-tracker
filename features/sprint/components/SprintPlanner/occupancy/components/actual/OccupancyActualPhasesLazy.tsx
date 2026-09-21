'use client';

import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { GitLabMergeRequestFact } from '@/lib/gitlab/mergeRequestFactTypes';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useEffect, useRef, useState } from 'react';

import { useOccupancyScroll } from '../../OccupancyScrollCtx';

import { OccupancyActualPhases } from './OccupancyActualPhases';

/** Зона предзагрузки (px) — таймлайн факта рендерится до входа строки в видимую область */
const ROOT_MARGIN_PX = 500;

interface OccupancyActualPhasesLazyProps {
  changelog: ChangelogEntry[];
  comments: IssueComment[];
  developerMap: Map<string, Developer>;
  durations: StatusDuration[];
  factRowHeight: number;
  gitlabFact?: GitLabMergeRequestFact;
  showComments: boolean;
  showGitlab?: boolean;
  showReestimations: boolean;
  showStatuses: boolean;
  sprintStartDate: Date;
  taskCreatedAt?: string | null;
  taskId: string;
  tasksMap?: Map<string, Task>;
  totalParts?: number;
}

/**
 * Обёртка над OccupancyActualPhases: рендерит тяжёлый таймлайн факта только когда строка
 * попадает в viewport скролл-контейнера. Устраняет фризы при большом числе строк.
 */
export function OccupancyActualPhasesLazy({
  factRowHeight,
  ...phasesProps
}: OccupancyActualPhasesLazyProps) {
  const { scrollContainerRef } = useOccupancyScroll();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [opacityReady, setOpacityReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const root = scrollContainerRef?.current ?? null;
    if (!el || !root) {
      const id = requestAnimationFrame(() => setIsInView(true));
      return () => cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === el) {
            setIsInView(entry.isIntersecting);
            break;
          }
        }
      },
      {
        root,
        rootMargin: `${ROOT_MARGIN_PX}px 0px ${ROOT_MARGIN_PX}px 0px`,
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollContainerRef]);

  useEffect(() => {
    if (!isInView) {
      const id = requestAnimationFrame(() => setOpacityReady(false));
      return () => cancelAnimationFrame(id);
    }
    const id = requestAnimationFrame(() => setOpacityReady(true));
    return () => cancelAnimationFrame(id);
  }, [isInView]);

  return (
    <div
      ref={containerRef}
      className="absolute left-0 right-0 bottom-0 pointer-events-none overflow-visible"
      style={{ height: factRowHeight }}
    >
      {isInView && (
        <div
          className={`occupancy-lazy-fade-in ${opacityReady ? 'opacity-100' : 'opacity-0'}`}
        >
          <OccupancyActualPhases {...phasesProps} />
        </div>
      )}
    </div>
  );
}
