'use client';

import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';

interface SwimlaneDiagramEditorPendingProps {
  closeLabel: string;
  name?: string;
  title: string;
  onClose: () => void;
}

/** Оболочка редактора схемы, пока POST/GET ещё идут. */
export function SwimlaneDiagramEditorPending({
  closeLabel,
  name,
  onClose,
  title,
}: SwimlaneDiagramEditorPendingProps) {
  return createPortal(
    <div
      aria-busy
      aria-label={title}
      className={`fixed inset-0 flex flex-col bg-black/70 p-4 ${ZIndex.class('modalBackdrop')}`}
      role="dialog"
      onClick={onClose}
    >
      <div
        className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-900 ${ZIndex.class('modal')}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
          <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-gray-800 dark:text-gray-100">
            {name?.trim() || title}
          </span>
          <Button
            aria-label={closeLabel}
            className="!h-8 !w-8 !min-h-0 !min-w-0 !rounded-full !p-0"
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            <Icon className="h-4 w-4" name="close" size="sm" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center text-gray-400">
          <Icon className="h-8 w-8 animate-spin" name="spinner" />
        </div>
      </div>
    </div>,
    document.body
  );
}
