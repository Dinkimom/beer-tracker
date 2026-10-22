import { useEffect, useRef } from 'react';

const MAX_SQUASH = 0.15;
/** Сжатие срока заметно слабее растяжения: карточка лишь слегка вытягивается вверх. */
const MAX_STRETCH_UP = 0.06;
const SQUASH_STRENGTH = 1.5;

/** Пружина во время жеста: жёсткая, почти без колебаний — форма идёт за рукой. */
const DRAG_SPRING = { stiffness: 420, damping: 26 };
/** Пружина после отпускания: мягче и слабее демпфирована — отдача как у резинки. */
const RELEASE_SPRING = { stiffness: 320, damping: 11 };
/** Импульс скорости на шаг ресайза; быстрые шаги подряд толкают сильнее. */
const STEP_KICK = 5;
const KICK_REFERENCE_MS = 60;
const MAX_KICK_FACTOR = 2.5;
const MAX_DEFLECTION = 0.3;
const MAX_FRAME_DT = 1 / 30;
const REST_EPSILON = 0.0005;

export interface TaskBarSquashSpringState {
  /** Отклонение scaleY от 1: < 0 — ниже, > 0 — выше. */
  deflection: number;
  velocity: number;
}

/**
 * Целевой прогиб на время ресайза относительно длины до жеста: растянули — ниже, сжали — выше.
 * Зависит от отношения длин (логарифм), с плавным насыщением до MAX_SQUASH / MAX_STRETCH_UP.
 */
export function resolveTaskBarResizeSquashDeflection(
  committedDurationParts: number,
  previewDurationParts: number
): number {
  if (committedDurationParts <= 0 || previewDurationParts <= 0) return 0;
  const stretch = Math.log(previewDurationParts / committedDurationParts);
  const amplitude = stretch > 0 ? MAX_SQUASH : MAX_STRETCH_UP;
  return -amplitude * Math.tanh(stretch * SQUASH_STRENGTH);
}

/** Импульс скорости на смену цели: чем быстрее шаги идут друг за другом, тем сильнее. */
export function resolveTaskBarSquashKick(targetDelta: number, msSincePreviousStep: number): number {
  const speedFactor = Math.min(
    MAX_KICK_FACTOR,
    KICK_REFERENCE_MS / Math.max(msSincePreviousStep, 1)
  );
  return targetDelta * STEP_KICK * speedFactor;
}

/** Один шаг затухающей пружины (полунеявный Эйлер). */
export function stepTaskBarSquashSpring(
  state: TaskBarSquashSpringState,
  target: number,
  dt: number,
  released: boolean
): TaskBarSquashSpringState {
  const { damping, stiffness } = released ? RELEASE_SPRING : DRAG_SPRING;
  const acceleration = -stiffness * (state.deflection - target) - damping * state.velocity;
  const velocity = state.velocity + acceleration * dt;
  const deflection = Math.max(
    -MAX_DEFLECTION,
    Math.min(MAX_DEFLECTION, state.deflection + velocity * dt)
  );
  return { deflection, velocity };
}

function isSpringAtRest(state: TaskBarSquashSpringState, target: number): boolean {
  return (
    Math.abs(state.deflection - target) < REST_EPSILON &&
    Math.abs(state.velocity) < REST_EPSILON * 10
  );
}

/**
 * Карточка «тянется» вместе с ресайзом за рукоятку и отыгрывает отдачу после отпускания.
 * Анимируется только `transform` внутреннего слоя: геометрия корня (и стрелки связей) не трогается.
 */
export function useTaskBarResizeSquash(
  layerRef: React.RefObject<HTMLElement | null>,
  input: {
    enabled: boolean;
    resizePreviewDuration: number | null;
    resizeStartDuration: number | null;
  }
): void {
  const { enabled, resizePreviewDuration, resizeStartDuration } = input;
  const springRef = useRef<TaskBarSquashSpringState>({ deflection: 0, velocity: 0 });
  const targetRef = useRef(0);
  const releasedRef = useRef(true);
  const lastStepAtRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const element = layerRef.current;
    if (!enabled || !element || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const released = resizePreviewDuration == null || resizeStartDuration == null;
    const target = released
      ? 0
      : resolveTaskBarResizeSquashDeflection(resizeStartDuration, resizePreviewDuration);
    const now = performance.now();
    if (!released && target !== targetRef.current) {
      springRef.current = {
        ...springRef.current,
        velocity:
          springRef.current.velocity +
          resolveTaskBarSquashKick(target - targetRef.current, now - lastStepAtRef.current),
      };
      lastStepAtRef.current = now;
    }
    targetRef.current = target;
    releasedRef.current = released;
    if (frameRef.current != null || isSpringAtRest(springRef.current, target)) {
      return;
    }

    let previousTime = now;
    const tick = (time: number) => {
      // Слой мог смениться или отключиться от DOM: цикл не должен писать в старый узел.
      if (layerRef.current !== element || !element.isConnected) {
        element.style.transform = '';
        springRef.current = { deflection: 0, velocity: 0 };
        frameRef.current = null;
        return;
      }
      const dt = Math.min(MAX_FRAME_DT, Math.max(0, time - previousTime) / 1000);
      previousTime = time;
      springRef.current = stepTaskBarSquashSpring(
        springRef.current,
        targetRef.current,
        dt,
        releasedRef.current
      );
      if (releasedRef.current && isSpringAtRest(springRef.current, 0)) {
        springRef.current = { deflection: 0, velocity: 0 };
        element.style.transform = '';
        frameRef.current = null;
        return;
      }
      element.style.transform = `scaleY(${(1 + springRef.current.deflection).toFixed(4)})`;
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [enabled, layerRef, resizePreviewDuration, resizeStartDuration]);

  // Cleanup бывает и без размонтирования (React отключает эффекты, сохраняя refs):
  // сбрасываем цикл полностью, иначе `frameRef` навсегда «занят» и анимация больше не стартует.
  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      springRef.current = { deflection: 0, velocity: 0 };
      if (layerRef.current) layerRef.current.style.transform = '';
    },
    [layerRef]
  );
}
