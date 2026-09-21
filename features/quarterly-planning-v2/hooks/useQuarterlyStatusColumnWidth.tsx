'use client';

import type { Task } from '@/types';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { StatusTag } from '@/components/StatusTag';

import {
  quarterlyStatusColumnWidthFallback,
  resolveQuarterlyStatusColumnWidth,
  tasksForQuarterlyStatusColumnMeasure,
} from '../utils/quarterlyStatusColumnWidth';

function QuarterlyStatusColumnWidthMeasurer({
  measureTasks,
  onWidth,
}: {
  measureTasks: Task[];
  onWidth: (widthPx: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    let maxButton = 0;
    root.querySelectorAll('[data-quarterly-status-measure]').forEach((node) => {
      maxButton = Math.max(maxButton, (node as HTMLElement).offsetWidth);
    });
    onWidth(resolveQuarterlyStatusColumnWidth(maxButton));
  }, [measureTasks, onWidth]);

  if (measureTasks.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed left-[-10000px] top-0 flex flex-col gap-1 opacity-0"
    >
      {measureTasks.map((task) => (
        <Button
          key={`${task.id}-${task.originalStatus}`}
          className="!h-auto !min-h-0 w-max !justify-between !gap-1 !rounded-md !px-1.5 !py-1"
          data-quarterly-status-measure
          type="button"
          variant="outline"
        >
          <StatusTag
            className="text-[10px]"
            status={task.originalStatus}
            statusColorKey={task.statusColorKey}
          />
          <Icon className="h-3 w-3 shrink-0" name="chevron-down" />
        </Button>
      ))}
    </div>
  );
}

export function useQuarterlyStatusColumnWidth(tasks: Task[]) {
  const [statusColumnWidth, setStatusColumnWidth] = useState(
    quarterlyStatusColumnWidthFallback
  );

  const measureTasks = useMemo(() => tasksForQuarterlyStatusColumnMeasure(tasks), [tasks]);
  const measureSignature = useMemo(
    () => measureTasks.map((t) => `${t.id}:${t.originalStatus}:${t.statusColorKey ?? ''}`).join('|'),
    [measureTasks]
  );

  const handleMeasured = useCallback((widthPx: number) => {
    setStatusColumnWidth(widthPx);
  }, []);

  const measurer =
    measureTasks.length > 0 ? (
      <QuarterlyStatusColumnWidthMeasurer
        key={measureSignature}
        measureTasks={measureTasks}
        onWidth={handleMeasured}
      />
    ) : null;

  return { statusColumnWidth, statusColumnWidthMeasurer: measurer };
}
