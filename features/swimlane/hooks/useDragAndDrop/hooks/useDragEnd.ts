/**
 * Хук для обработки окончания перетаскивания
 */

import {
  createSwimlaneDragEndHandler,
  type DragContextRef,
} from '@/lib/layers/application/swimlaneDrag';

export type { DragContextRef };

/** Те же параметры, что у обработчика: хук только отдаёт его компоненту. */
type UseDragEndProps = Parameters<typeof createSwimlaneDragEndHandler>[0];

export function useDragEnd(props: UseDragEndProps) {
  return {
    handleDragEnd: createSwimlaneDragEndHandler(props),
  };
}
