'use client';

import type { TaskCardBoard, TaskCardFieldId, TaskCardSlotId, TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

import { DndContext, DragOverlay, PointerSensor, pointerWithin, rectIntersection, useSensor, useSensors } from '@dnd-kit/core';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  arrangeTaskCardSlots,
  moveTaskCardSlotItem,
  taskCardSlotItemChangesSlot,
  taskCardSlotItemGroups,
} from '@/lib/taskCard/taskCardSlotEdits';
import { taskCardSlotLayoutsEqual } from '@/lib/taskCard/taskCardSlots';

import { TaskCardSlotBoardZone, type TaskCardSlotBoardSelection } from './TaskCardSlotBoardZone';
import { taskCardFieldLabel } from './taskCardSlotLabels';

interface TaskCardSlotBoardProps {
  board?: TaskCardBoard;
  layout: TaskCardSlotLayout;
  selected: TaskCardSlotBoardSelection;
  onChange: (layout: TaskCardSlotLayout) => void;
  onSelect: (selected: TaskCardSlotBoardSelection) => void;
}

const preferChipCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const pool = hits.length > 0 ? hits : rectIntersection(args);
  const chips = pool.filter((hit) => !String(hit.id).startsWith('zone:'));
  return chips.length > 0 ? chips : pool;
};

export function TaskCardSlotBoard({
  board = 'swimlane',
  layout,
  onChange,
  onSelect,
  selected,
}: TaskCardSlotBoardProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<TaskCardSlotLayout | null>(null);
  const [draggingLabel, setDraggingLabel] = useState<string | null>(null);
  const current = draft ?? layout;
  const layoutRef = useRef(current);
  useEffect(() => {
    layoutRef.current = current;
  }, [current]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const overlayRoot = typeof document === 'undefined' ? null : document.body;

  const previewMove = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) {
      return;
    }
    const activeId = String(event.active.id);
    const groups = taskCardSlotItemGroups(layoutRef.current);
    if (!taskCardSlotItemChangesSlot(groups, activeId, overId)) {
      return;
    }
    const next = layoutAfterMove(layoutRef.current, activeId, overId);
    if (!next) {
      return;
    }
    layoutRef.current = next;
    setDraft(next);
  };

  const finish = (event: DragEndEvent) => {
    setDraggingLabel(null);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) {
      setDraft(null);
      return;
    }
    const activeId = String(event.active.id);
    const originSlot = groupSlot(taskCardSlotItemGroups(layout), activeId);
    const liveSlot = groupSlot(taskCardSlotItemGroups(layoutRef.current), activeId);
    const next =
      originSlot && liveSlot && originSlot !== liveSlot
        ? layoutRef.current
        : layoutAfterMove(layout, activeId, overId) ?? layout;
    layoutRef.current = next;
    setDraft(null);
    if (!taskCardSlotLayoutsEqual(next, layout)) {
      onChange(next);
    }
  };

  return (
    <DndContext
      collisionDetection={preferChipCollision}
      sensors={sensors}
      onDragCancel={() => {
        setDraggingLabel(null);
        setDraft(null);
      }}
      onDragEnd={finish}
      onDragOver={previewMove}
      onDragStart={(event: DragStartEvent) => {
        setDraggingLabel(labelFromDrag(event, layoutRef.current, t));
      }}
    >
      <div className="flex w-full flex-col gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <TaskCardSlotBoardZone
          board={board}
          className="w-full"
          layout={current}
          selected={selected}
          slot="eyebrow"
          onChange={onChange}
          onSelect={onSelect}
        />
        <TaskCardSlotBoardZone
          board={board}
          className="w-full"
          layout={current}
          selected={selected}
          slot="titleLead"
          suffix={
            <span className="flex min-w-[7.5rem] flex-1 items-center self-stretch rounded-md border border-gray-300 bg-white py-1 pl-1 pr-1 text-[13px] font-medium leading-none text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <span className="min-w-0 flex-1 truncate px-1 py-0.5">{t('settings.planningTab.cardSlots.titlePlaceholder')}</span>
            </span>
          }
          onChange={onChange}
          onSelect={onSelect}
        />
        <div className="flex w-full items-start gap-1.5">
          <TaskCardSlotBoardZone
            board={board}
            className="min-w-0 w-full flex-1"
            layout={current}
            selected={selected}
            slot="footer"
            onChange={onChange}
            onSelect={onSelect}
          />
          <TaskCardSlotBoardZone
            alignEnd
            board={board}
            className="w-auto shrink-0"
            layout={current}
            selected={selected}
            slot="footerEnd"
            onChange={onChange}
            onSelect={onSelect}
          />
        </div>
      </div>
      {overlayRoot
        ? createPortal(
            <DragOverlay style={{ pointerEvents: 'none', zIndex: ZIndex.overlay }}>
              {draggingLabel ? (
                <span className="inline-flex cursor-grabbing items-center rounded-md border border-blue-700/20 bg-blue-600 px-2.5 py-1 text-[13px] font-medium leading-none text-white shadow">
                  {draggingLabel}
                </span>
              ) : null}
            </DragOverlay>,
            overlayRoot
          )
        : null}
    </DndContext>
  );
}

function groupSlot(groups: Record<TaskCardSlotId, readonly string[]>, itemId: string): TaskCardSlotId | null {
  if (groups.eyebrow.includes(itemId)) {
    return 'eyebrow';
  }
  if (groups.titleLead.includes(itemId)) {
    return 'titleLead';
  }
  if (groups.footer.includes(itemId)) {
    return 'footer';
  }
  if (groups.footerEnd.includes(itemId)) {
    return 'footerEnd';
  }
  return null;
}

function layoutAfterMove(current: TaskCardSlotLayout, activeId: string, overId: string): TaskCardSlotLayout | null {
  const nextGroups = moveTaskCardSlotItem(taskCardSlotItemGroups(current), activeId, overId);
  if (!nextGroups) {
    return null;
  }
  return arrangeTaskCardSlots(current, nextGroups);
}

function labelFromDrag(
  event: DragStartEvent,
  layout: TaskCardSlotLayout,
  t: (key: string, params?: Record<string, number | string>) => string
): string | null {
  const data = event.active.data.current;
  if (!data) {
    return null;
  }
  if (data.kind === 'builtin') {
    return taskCardFieldLabel(data.field as TaskCardFieldId, t);
  }
  if (data.kind === 'custom' && typeof data.fieldId === 'string') {
    const placement = layout.customPlacements.find((item) => item.fieldId === data.fieldId);
    return placement?.label || data.fieldId;
  }
  return null;
}
