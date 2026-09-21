'use client';

import { useEffect } from 'react';

import { useThemeStorage } from '@/hooks/useLocalStorage';
import { syncDocumentThemeColor } from '@/lib/pwa/pwaThemeColor';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useThemeStorage();

  // Применяем тему при изменении. Держим theme-changing достаточно долго, чтобы React
  // успел перерисовать фазы (в т.ч. градиент фона) до включения transition обратно.
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';

    root.classList.add('theme-changing');
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    syncDocumentThemeColor(document, isDark);
    const t = setTimeout(() => {
      root.classList.remove('theme-changing');
    }, 120);
    return () => {
      clearTimeout(t);
      root.classList.remove('theme-changing');
    };
  }, [theme]);

  return children;
}
