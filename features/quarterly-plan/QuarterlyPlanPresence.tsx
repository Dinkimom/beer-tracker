'use client';

import type { QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { SprintPresenceFocusState, SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';
import type { CSSProperties, ReactNode } from 'react';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  SprintCardPresenceProvider,
  useSprintCardPresenceViewers,
  useSprintPresenceColorSlots,
} from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { useSprintCardPresenceReporter } from '@/hooks/useSprintCardPresenceReporter';
import { sprintCardPresenceChangingViewer } from '@/lib/realtime/sprintCardPresence';
import { SPRINT_PRESENCE_COLOR_CSS_VAR, sprintPresenceViewerColor } from '@/lib/realtime/sprintPresenceColor';

/** Что человек делает с полосой или заметкой; `null` — жест закончился. */
type QuarterPresenceActivity = Exclude<SprintPresenceFocusState, 'linking' | 'viewing'>;

interface QuarterPresenceReport {
  setActivity: (id: string, activity: QuarterPresenceActivity | null) => void;
  setHovered: (id: string, hovered: boolean) => void;
}

const NO_REPORT: QuarterPresenceReport = { setActivity: () => undefined, setHovered: () => undefined };

const QuarterPresenceReportContext = createContext<QuarterPresenceReport>(NO_REPORT);

interface QuarterlyPlanPresenceProps {
  children: ReactNode;
  quarterRef: QuarterRef;
  /** Кто сейчас на доске квартала — из `quarter.presence`. */
  viewers: readonly SprintPresenceViewer[];
}

/**
 * Присутствие на квартальном плане (QS7) — тот же механизм, что на доске спринта: чужие аватары на
 * полосе или заметке, обводка цветом человека и запрет своих жестов, пока её меняет другой. Свой
 * фокус (навёл, несёт, растягивает, редактирует) доска сообщает в presence отсюда.
 */
export function QuarterlyPlanPresence({ children, quarterRef, viewers }: QuarterlyPlanPresenceProps) {
  const [active, setActive] = useState<{ activity: QuarterPresenceActivity; id: string } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const report = useMemo<QuarterPresenceReport>(
    () => ({
      setActivity: (id, activity) =>
        setActive((current) => {
          if (activity) return current?.id === id && current.activity === activity ? current : { activity, id };
          return current?.id === id ? null : current;
        }),
      setHovered: (id, hovered) => setHoveredId((current) => (hovered ? id : current === id ? null : current)),
    }),
    []
  );
  const idDoing = (activity: QuarterPresenceActivity) => (active?.activity === activity ? active.id : null);
  useSprintCardPresenceReporter({
    contextMenuTaskId: null,
    draggingTaskId: idDoing('dragging'),
    editingTaskId: idDoing('editing'),
    gesture: null,
    hoveredTaskId: hoveredId,
    linkingTaskId: null,
    quarter: quarterRef,
    resizingTaskId: idDoing('resizing'),
    sprintId: null,
  });
  return (
    <QuarterPresenceReportContext.Provider value={report}>
      <SprintCardPresenceProvider viewers={viewers}>{children}</SprintCardPresenceProvider>
    </QuarterPresenceReportContext.Provider>
  );
}

/**
 * Присутствие на одной полосе или заметке: сообщает свой жест `activity` и наведение, а про чужих
 * говорит, занята ли сущность (`locked` — её несут, растягивают или редактируют) и чем её обвести.
 */
export function useQuarterPresenceTarget(id: string, activity: QuarterPresenceActivity | null) {
  const report = useContext(QuarterPresenceReportContext);
  useEffect(() => {
    report.setActivity(id, activity);
    return () => report.setActivity(id, null);
  }, [activity, id, report]);
  useEffect(() => () => report.setHovered(id, false), [id, report]);

  // Своя вкладка сюда не попадает: кто меняет — всегда другой человек.
  const changing = sprintCardPresenceChangingViewer(useSprintCardPresenceViewers(id));
  const colorSlots = useSprintPresenceColorSlots();
  return {
    hoverProps: {
      onPointerEnter: () => report.setHovered(id, true),
      onPointerLeave: () => report.setHovered(id, false),
    },
    locked: changing !== null,
    /** Обводка цветом того, кто меняет: тот же цвет у его аватара в тулбаре. */
    ringClass: changing ? 'sprint-card-presence-changing' : '',
    ringStyle: (changing
      ? { [SPRINT_PRESENCE_COLOR_CSS_VAR]: sprintPresenceViewerColor(colorSlots, changing) }
      : {}) as CSSProperties,
  };
}
