import { Toaster } from 'react-hot-toast';

import { ZIndex } from '@/constants/zIndex';

/**
 * Глобальные тосты. Панель — то же стекло, что у контекстного меню
 * (`.floating-menu-glass`): цвета, кромка, тень и blur — токены `--toast-*` в `globals.css`.
 */
export function AppToaster() {
  return (
    <Toaster
      containerStyle={{ zIndex: ZIndex.value('toast') }}
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--toast-bg)',
          color: 'var(--toast-fg)',
          border: '1px solid var(--toast-border)',
          borderRadius: '0.5rem',
          boxShadow: 'var(--toast-shadow)',
          backdropFilter: 'var(--toast-backdrop)',
          WebkitBackdropFilter: 'var(--toast-backdrop)',
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
        },
        success: {
          duration: 3000,
          iconTheme: { primary: 'var(--toast-success)', secondary: 'var(--toast-icon-fg)' },
        },
        error: {
          duration: 5000,
          iconTheme: { primary: 'var(--toast-error)', secondary: 'var(--toast-icon-fg)' },
        },
      }}
    />
  );
}
