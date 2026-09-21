/**
 * Утилиты для оптимизации производительности React компонентов
 */

import { debounce } from 'lodash-es';
import { useMemo } from 'react';

/**
 * Хук для создания debounced версии функции
 *
 * @example
 * const debouncedUpdate = useDebouncedCallback(updateXarrow, 100);
 * debouncedUpdate(); // Вызовется через 100ms
 */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
  options?: {
    leading?: boolean;
    maxWait?: number;
    trailing?: boolean;
  }
) {
  return useMemo(
    () => debounce(callback, delay, {
      leading: options?.leading ?? true,
      trailing: options?.trailing ?? true,
      maxWait: options?.maxWait,
    }),
    [callback, delay, options?.leading, options?.trailing, options?.maxWait]
  );
}

