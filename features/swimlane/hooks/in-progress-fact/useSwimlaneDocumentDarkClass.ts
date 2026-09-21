'use client';

import { useEffect, useState } from 'react';

/** Синхронизация с классом `dark` на `document.documentElement` (бейзлайн таймлайна задач). */
export function useSwimlaneDocumentDarkClass(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}
