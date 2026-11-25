/**
 * «Приземление» карточки свимлейна после перетаскивания. Превью DragOverlay исчезает сразу
 * (`dropAnimation={null}`: после дропа карточка может перемонтироваться в другой строке), поэтому
 * анимируется уже стоящая на новом месте карточка — от прямоугольника, где отпустили превью, к своей
 * ячейке (FLIP).
 *
 * Дроп запоминает, откуда лететь (`settleSwimlaneCardAfterDrop`); карточка забирает это в layout-эффекте
 * того же коммита, где она снова видна, — до отрисовки, без кадра «на новом месте» перед полётом.
 * `translate` / `scale` — отдельные от `transform` свойства: раскладка карточки не трогается.
 */
import type { ClientRect } from '@dnd-kit/core';
import type { RefObject } from 'react';

import { useLayoutEffect } from 'react';

import { ZIndex } from '@/constants';

const SETTLE_DURATION_MS = 220;
/** Дольше этого дроп не ждёт карточку (дроп в сайдбар, карточка ушла с экрана). */
const PENDING_TTL_MS = 1000;
/** Дальше этого — без полёта через всю доску. */
const MAX_FLIGHT_PX = 1200;

let pending: { expiresAt: number; from: ClientRect; taskId: string } | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Дроп или отмена перетаскивания карточки с доски: `from` — где в этот момент было превью. */
export function settleSwimlaneCardAfterDrop(taskId: string | undefined, from: ClientRect | null | undefined): void {
  if (!taskId || !from || typeof window === 'undefined' || prefersReducedMotion()) {
    return;
  }
  pending = { expiresAt: performance.now() + PENDING_TTL_MS, from, taskId };
}

function takePendingSettle(taskId: string): ClientRect | null {
  if (pending == null || pending.taskId !== taskId) {
    return null;
  }
  const { expiresAt, from } = pending;
  pending = null;
  return performance.now() <= expiresAt ? from : null;
}

function playSettle(el: HTMLElement, from: ClientRect): void {
  const to = el.getBoundingClientRect();
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  if (Math.hypot(dx, dy) > MAX_FLIGHT_PX) {
    return;
  }
  el.animate(
    [
      {
        filter: 'drop-shadow(0 14px 22px rgb(0 0 0 / 0.22))',
        scale: '1.03',
        translate: `${dx}px ${dy}px`,
        zIndex: ZIndex.dragPreview,
      },
      {
        filter: 'drop-shadow(0 0 0 rgb(0 0 0 / 0))',
        scale: '1',
        translate: '0 0',
        zIndex: ZIndex.dragPreview,
      },
    ],
    { duration: SETTLE_DURATION_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
  );
}

/**
 * Карточка доски: когда она снова видна после перетаскивания (или встала на новое место / смонтировалась
 * в новой строке), проигрывает приземление, если дроп был её.
 */
export function useSwimlaneDropSettle(
  rootRef: RefObject<HTMLElement | null>,
  taskId: string,
  hiddenForOverlay: boolean,
  left: unknown
): void {
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (hiddenForOverlay || !el) {
      return;
    }
    const from = takePendingSettle(taskId);
    if (from) {
      playSettle(el, from);
    }
  }, [rootRef, taskId, hiddenForOverlay, left]);
}
