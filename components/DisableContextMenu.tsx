'use client';

import { useEffect } from 'react';

/**
 * Компонент, который блокирует показ нативного контекстного меню браузера на всем сайте
 */
export function DisableContextMenu() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Добавляем обработчик на document для перехвата всех событий contextmenu
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return null;
}
