'use client';

import type { ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import { OVERLAY_BACKDROP_ENTER, OVERLAY_CENTERED_DIALOG_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';

interface QuarterlyPlanDialogProps {
  children: ReactNode;
  /** Ширина и высота окна: классы Tailwind (`max-w-xl`, `max-h-[80vh]`). */
  className?: string;
  description: string;
  open?: boolean;
  title: string;
  onClose: () => void;
}

/** Модальное окно доски квартала: затемнение, заголовок с пояснением и содержимое — общая оболочка диалогов. */
export function QuarterlyPlanDialog({ children, className = 'max-w-xl', description, open = true, title, onClose }: QuarterlyPlanDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <div aria-hidden className={`fixed inset-0 ${OVERLAY_BACKDROP_ENTER}`} style={{ zIndex: ZIndex.modalBackdrop }}>
          <Dialog.Overlay className="absolute inset-0 bg-black/50 dark:bg-black/70" />
        </div>
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 flex w-full -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800 ${OVERLAY_CENTERED_DIALOG_ANIMATION} ${className}`}
          style={{ zIndex: ZIndex.modal }}
        >
          <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</Dialog.Title>
          <Dialog.Description className="-mt-3 text-sm text-ds-text-muted">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
