'use client';

import type { ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import { OVERLAY_BACKDROP_ENTER, OVERLAY_CENTERED_DIALOG_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';

interface ModalProps {
  /**
   * Окно со своей раскладкой (вкладки, сменные экраны): содержимое занимает панель целиком и само рисует
   * шапку и прокрутку; `title` остаётся для скринридера. Обычному окну не нужно.
   */
  bare?: boolean;
  children: ReactNode;
  /** Размер окна: классы Tailwind (`max-w-xl`, `max-h-[80vh]`). */
  className?: string;
  /** Клик по затемнению закрывает окно. У форм с вводом — `false`: клик мимо не теряет введённое. */
  closeOnBackdrop?: boolean;
  description?: string;
  /** Кнопки действий: стоят под содержимым и не прокручиваются вместе с ним. */
  footer?: ReactNode;
  open?: boolean;
  title: string;
  onClose: () => void;
}

/**
 * Модальное окно приложения — одна оболочка на все: затемнение, заголовок с пояснением, прокручиваемое
 * содержимое и кнопки внизу. Escape закрывает окно, фокус остаётся внутри (Radix Dialog).
 * Подтверждение действия — `useConfirmDialog`, не это окно.
 */
export function Modal({
  bare = false,
  children,
  className = 'max-w-md',
  closeOnBackdrop = true,
  description,
  footer,
  open = true,
  title,
  onClose,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <div aria-hidden className={`fixed inset-0 ${OVERLAY_BACKDROP_ENTER}`} style={{ zIndex: ZIndex.modalBackdrop }}>
          <Dialog.Overlay className="absolute inset-0 bg-black/50 dark:bg-black/70" />
        </div>
        <Dialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={`fixed left-1/2 top-1/2 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800 ${OVERLAY_CENTERED_DIALOG_ANIMATION} ${className}`}
          style={{ zIndex: ZIndex.modal }}
          onInteractOutside={(event) => {
            if (!closeOnBackdrop) event.preventDefault();
          }}
        >
          {bare ? (
            <>
              <Dialog.Title className="sr-only">{title}</Dialog.Title>
              {children}
            </>
          ) : (
            <>
              <div className="flex shrink-0 flex-col gap-1 px-5 pt-5">
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="text-sm text-ds-text-muted">{description}</Dialog.Description>
                ) : null}
              </div>
              <div
                className={`scrollbar-thin-custom flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4 ${footer ? 'pb-4' : 'pb-5'}`}
              >
                {children}
              </div>
              {footer ? (
                <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
                  {footer}
                </div>
              ) : null}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
