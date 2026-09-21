'use client';

import { useEffect, useRef, useState } from 'react';

import { copyTextToClipboard } from '@/utils/copyToClipboard';

/** Сколько держать галку вместо иконки после успешного копирования. */
export const COPY_FEEDBACK_MS = 1500;

/**
 * Копирование в буфер с кратким UI-фидбеком (галка на кнопке вместо toast).
 */
export function useCopyFeedback(resetMs: number = COPY_FEEDBACK_MS): {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
} {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = async (text: string): Promise<boolean> => {
    const ok = await copyTextToClipboard(text);
    if (!ok) {
      return false;
    }
    setCopied(true);
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, resetMs);
    return true;
  };

  return { copied, copy };
}
