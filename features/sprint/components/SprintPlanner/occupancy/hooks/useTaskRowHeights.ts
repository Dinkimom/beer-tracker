import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

function planSignatureStrictness(sig: string): number {
  const [d, q] = sig.split(':');
  let n = 0;
  if (d === '1') n += 1;
  if (q === '1') n += 1;
  return n;
}

function collectTaskIdsWithIncreasedPlanStrictness(
  taskPlanSignatures: Map<string, string>,
  prev: Map<string, string>
): string[] {
  const idsToClear: string[] = [];
  for (const [taskId, sig] of taskPlanSignatures) {
    const oldSig = prev.get(taskId);
    if (oldSig === undefined || oldSig === sig) continue;
    if (planSignatureStrictness(sig) > planSignatureStrictness(oldSig)) {
      idsToClear.push(taskId);
    }
  }
  return idsToClear;
}

function measureRowContentHeight(el: HTMLElement): number {
  const rectH = el.getBoundingClientRect().height;
  return Math.ceil(Math.max(rectH, el.scrollHeight));
}

export function useTaskRowHeights(
  visibleTaskIds: Set<string>,
  visibleRowsCount: number,
  /** При смене compact / fact — полный сброс кэша высот */
  layoutKey?: string,
  /** Сигнатура dev:qa по taskId из OccupancyView */
  taskPlanSignatures?: Map<string, string>
) {
  const [taskRowHeights, setTaskRowHeights] = useState<Map<string, number>>(
    new Map()
  );
  const rowElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const prevPlanSigsRef = useRef<Map<string, string>>(new Map());
  const taskPlanSignaturesRef = useRef(taskPlanSignatures);

  useLayoutEffect(() => {
    taskPlanSignaturesRef.current = taskPlanSignatures;
  }, [taskPlanSignatures]);

  useEffect(() => {
    if (layoutKey == null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional cache reset when layout mode changes
    setTaskRowHeights(new Map());
    const sigs = taskPlanSignaturesRef.current;
    prevPlanSigsRef.current = sigs ? new Map(sigs) : new Map();
  }, [layoutKey]);

  useLayoutEffect(() => {
    if (!taskPlanSignatures || taskPlanSignatures.size === 0) return;

    const prev = prevPlanSigsRef.current;
    const idsToClear = collectTaskIdsWithIncreasedPlanStrictness(taskPlanSignatures, prev);
    prevPlanSigsRef.current = new Map(taskPlanSignatures);

    if (idsToClear.length === 0) return;


    setTaskRowHeights((heights) => {
      const next = new Map(heights);
      for (const id of idsToClear) {
        next.delete(id);
      }
      return next;
    });
  }, [taskPlanSignatures]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setTaskRowHeights((prev) => {
        const next = new Map(prev);
        for (const entry of entries) {
          const taskId = (entry.target as HTMLElement).getAttribute(
            'data-task-id'
          );
          if (taskId) {
            const el = entry.target as HTMLElement;
            next.set(taskId, measureRowContentHeight(el));
          }
        }
        return next;
      });
    });
    resizeObserverRef.current = observer;
    rowElementsRef.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  const setTaskRowRef = useCallback((taskId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      rowElementsRef.current.set(taskId, el);
      resizeObserverRef.current?.observe(el);
    } else {
      const prev = rowElementsRef.current.get(taskId);
      if (prev) {
        resizeObserverRef.current?.unobserve(prev);
        rowElementsRef.current.delete(taskId);
      }
    }
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      const next = new Map<string, number>();
      rowElementsRef.current.forEach((el, taskId) => {
        const h = measureRowContentHeight(el as HTMLElement);
        if (h > 0) next.set(taskId, h);
      });
      if (next.size > 0) setTaskRowHeights(next);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [visibleRowsCount]);

  useEffect(() => {
    const id = setTimeout(() => {
      setTaskRowHeights((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const taskId of next.keys()) {
          if (!visibleTaskIds.has(taskId)) {
            next.delete(taskId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 0);
    return () => clearTimeout(id);
  }, [visibleTaskIds]);

  return { taskRowHeights, setTaskRowRef };
}
