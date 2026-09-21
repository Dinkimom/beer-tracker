'use client';

import type { RefObject } from 'react';

import { createContext, useContext } from 'react';

export interface OccupancyScrollCtxValue {
  /**
   * Ссылка на DOM-элемент скролл-контейнера таблицы.
   * Чтение scrollLeft/clientWidth/scrollWidth напрямую даёт актуальные значения
   * без задержки React-state (RAF → setState → re-render).
   */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  /** Прокрутить контейнер плавно к указанному scrollLeft */
  scrollTo: (left: number) => void;
}

export const OccupancyScrollCtx = createContext<OccupancyScrollCtxValue>({
  scrollContainerRef: { current: null },
  scrollTo: () => {},
});

export function useOccupancyScroll(): OccupancyScrollCtxValue {
  return useContext(OccupancyScrollCtx);
}
