'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';

import {
  SwimlaneDragHoverStore,
  type CellPosition,
} from '@/lib/layers/application/swimlaneDrag';

const IDLE_HOVER_STORE = new SwimlaneDragHoverStore();

export const SwimlaneDragHoverContext = createContext<SwimlaneDragHoverStore>(IDLE_HOVER_STORE);

const noopSubscribe = () => () => {};

/**
 * Подписка на ячейку под курсором через селектор.
 * Компонент перерисуется, только если `select` вернул другое значение (Object.is):
 * селектор обязан возвращать примитив или уже существующую ссылку.
 */
export function useSwimlaneDragHoverSelector<T>(
  select: (cell: CellPosition | null) => T,
  enabled = true
): T {
  const store = useContext(SwimlaneDragHoverContext);
  const getSnapshot = () => select(enabled ? store.getSnapshot() : null);
  return useSyncExternalStore(enabled ? store.subscribe : noopSubscribe, getSnapshot, getSnapshot);
}

/** Ячейка под курсором, если она в строке `assigneeId`; иначе стабильный `null`. */
export function useSwimlaneLaneHoveredCell(
  assigneeId: string,
  enabled = true
): CellPosition | null {
  return useSwimlaneDragHoverSelector(
    (cell) => (cell?.assigneeId === assigneeId ? cell : null),
    enabled
  );
}
