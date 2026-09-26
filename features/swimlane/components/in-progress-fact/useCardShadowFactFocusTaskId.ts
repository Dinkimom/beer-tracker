'use client';

import { useCallback, useState } from 'react';

/** Id карточки под курсором. Бары факта меняют прозрачность в том же кадре, что и тень карточки. */
export function useCardShadowFactFocusTaskId(): {
  cardShadowTaskId: string | null;
  syncCardShadowHover: (taskId: string | null) => void;
} {
  const [cardShadowTaskId, setCardShadowTaskId] = useState<string | null>(null);
  const syncCardShadowHover = useCallback((taskId: string | null) => {
    setCardShadowTaskId(taskId);
  }, []);

  return { cardShadowTaskId, syncCardShadowHover };
}
