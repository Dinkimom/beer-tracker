/**
 * Базовый хук для управления изменением размера элементов
 * Использует requestAnimationFrame для оптимизации обновлений
 */

import { useEffect, useState } from 'react';

import { clampResizeValue, finalizeResizeOnMouseUp } from './useResizeHelpers';

interface UseResizeOptions {
  /**
   * Применить ограничения min/max к значению
   */
  clamp?: boolean;
  /**
   * Максимальное значение
   */
  max?: number;
  /**
   * Минимальное значение
   */
  min?: number;
  /**
   * Функция для вычисления нового значения на основе события мыши
   */
  calculateValue: (event: MouseEvent) => number;
  /**
   * Callback, вызываемый при завершении ресайза
   */
  onResizeEnd?: (value: number) => void;
  /**
   * Callback, вызываемый при изменении значения
   */
  onValueChange?: (value: number) => void;
}

/**
 * Базовый хук для управления ресайзом
 *
 * @example
 * ```tsx
 * const { isResizing, setIsResizing } = useResize({
 *   calculateValue: (e) => window.innerWidth - e.clientX,
 *   onValueChange: (width) => setWidth(width),
 *   min: 300,
 *   max: 800,
 *   clamp: true,
 * });
 * ```
 */
export function useResize({
  calculateValue,
  onValueChange,
  onResizeEnd,
  min,
  max,
  clamp = false,
}: UseResizeOptions) {
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    let rafId: number | null = null;
    let pendingValue: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const newValue = clampResizeValue(calculateValue(e), clamp, min, max);

      // Сохраняем значение для следующего кадра
      pendingValue = newValue;

      // Используем requestAnimationFrame для оптимизации обновлений
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (pendingValue !== null && onValueChange) {
            onValueChange(pendingValue);
            pendingValue = null;
          }
          rafId = null;
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);

      finalizeResizeOnMouseUp({
        calculateValue,
        clamp,
        event: e,
        max,
        min,
        onResizeEnd,
        onValueChange,
        pendingValue,
      });
      pendingValue = null;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isResizing, calculateValue, onValueChange, onResizeEnd, min, max, clamp]);

  return {
    isResizing,
    setIsResizing,
  };
}
