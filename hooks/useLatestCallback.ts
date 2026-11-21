import { useCallback, useEffect, useRef } from 'react';

/**
 * Функция со стабильной ссылкой, которая всегда вызывает последнюю переданную. Нужна, когда
 * колбэк новый на каждом рендере (например, `useXarrow`), а его кладут в зависимости эффектов,
 * `useMemo` или дебаунс — иначе они пересоздаются на каждый рендер.
 */
export function useLatestCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result
): (...args: Args) => Result {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
}
