/**
 * Компонент слоя задач в свимлейне
 */

'use client';

import type { TaskLayerProps } from './TaskLayer.types';

import React, { useEffect, useState } from 'react';

import { TaskLayerPositionedTaskItem } from '@/features/swimlane/components/TaskLayerPositionedTaskItem';

export function TaskLayer(props: TaskLayerProps) {
  const { positionedTasks, segmentEditTaskId, ...rest } = props;
  const [segmentEditDraftCells, setSegmentEditDraftCells] = useState<boolean[] | null>(null);

  useEffect(() => {
    // Сброс черновика ячеек при смене задачи в режиме редактора сегментов (один state на весь слой).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- намеренная синхронизация с segmentEditTaskId
    setSegmentEditDraftCells(null);
  }, [segmentEditTaskId]);

  return (
    <div
      className="task-layer-row absolute top-0 left-0 right-0 pointer-events-none"
      style={{ height: `${rest.totalHeight}px` }}
    >
      {positionedTasks.map(({ task, position }) => (
        <TaskLayerPositionedTaskItem
          key={task.id}
          {...rest}
          position={position}
          segmentEditDraftCells={segmentEditDraftCells}
          segmentEditTaskId={segmentEditTaskId}
          setSegmentEditDraftCells={setSegmentEditDraftCells}
          task={task}
        />
      ))}
    </div>
  );
}
