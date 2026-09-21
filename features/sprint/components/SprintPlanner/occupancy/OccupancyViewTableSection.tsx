'use client';

import type { DragEndEvent } from '@dnd-kit/core';
import type { ComponentProps } from 'react';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

import { OccupancyTableBody } from './components/table/OccupancyTableBody';
import { OccupancyTableHeader } from './components/table/OccupancyTableHeader';
import { OccupancyTaskArrows } from './components/task-arrows';
import {
  occupancyTableFooterMinWidth,
  occupancyTableStyle,
  occupancyTableWrapperClassName,
  occupancyTableWrapperStyle,
} from './OccupancyViewTableSectionHelpers';

export interface OccupancyViewTableSectionProps {
  bodyProps: ComponentProps<typeof OccupancyTableBody>;
  dayColumnWidth: number | undefined;
  displayColumnCount: number;
  handleTableClickCapture: NonNullable<ComponentProps<'table'>['onClickCapture']>;
  headerProps: ComponentProps<typeof OccupancyTableHeader>;
  /** Ширина колонки статуса (квартальный планировщик v2); 0 — одна колонка задач */
  statusColumnWidth?: number;
  tableScrollRef: React.RefObject<HTMLDivElement | null>;
  tableWidth: number | undefined;
  taskArrowsProps: ComponentProps<typeof OccupancyTaskArrows> | null;
  taskColumnWidth: number;
  onDragEnd: (event: DragEndEvent) => void;
}

/**
 * Скролл-область, DnD строк, таблица занятости и оверлей стрелок связей.
 * Вынесено из {@link OccupancyView}, чтобы снизить когнитивную сложность корневого компонента.
 */
export function OccupancyViewTableSection({
  tableScrollRef,
  onDragEnd,
  tableWidth,
  taskColumnWidth,
  statusColumnWidth = 0,
  displayColumnCount,
  dayColumnWidth,
  handleTableClickCapture,
  headerProps,
  bodyProps,
  taskArrowsProps,
}: OccupancyViewTableSectionProps) {
  const commentDndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  return (
    <div
      ref={tableScrollRef}
      className="flex w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-auto relative scrollbar-thin-custom scrollbar-gutter-stable"
    >
      <DndContext collisionDetection={closestCenter} sensors={commentDndSensors} onDragEnd={onDragEnd}>
        <div
          className={occupancyTableWrapperClassName(tableWidth)}
          style={occupancyTableWrapperStyle({ tableWidth })}
        >
          <table
            className="border-collapse table-fixed"
            data-occupancy-table
            style={occupancyTableStyle(tableWidth)}
            onClickCapture={handleTableClickCapture}
          >
            <colgroup>
              <col style={{ width: taskColumnWidth, minWidth: taskColumnWidth }} />
              {statusColumnWidth > 0 ? (
                <col
                  style={{
                    width: statusColumnWidth,
                    minWidth: statusColumnWidth,
                  }}
                />
              ) : null}
              {Array.from({ length: displayColumnCount }, (_, i) => (
                <col
                  key={i}
                  style={
                    dayColumnWidth != null
                      ? { width: dayColumnWidth, minWidth: dayColumnWidth }
                      : undefined
                  }
                />
              ))}
            </colgroup>
            <OccupancyTableHeader {...headerProps} />
            <OccupancyTableBody {...bodyProps} />
          </table>
          {taskArrowsProps != null ? <OccupancyTaskArrows {...taskArrowsProps} /> : null}
        </div>
        <div
          aria-hidden="true"
          className="h-8 w-full shrink-0 border-t border-ds-border-subtle bg-gradient-to-b from-transparent to-white/70 dark:to-gray-800/70"
          style={occupancyTableFooterMinWidth(tableWidth)}
        />
      </DndContext>
    </div>
  );
}
