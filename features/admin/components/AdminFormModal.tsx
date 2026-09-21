'use client';

import type { ReactNode } from 'react';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

interface AdminFormModalProps {
  busy?: boolean;
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  maxWidthClassName?: string;
  title: string;
  onClose: () => void;
}

export function AdminFormModal({
  busy = false,
  children,
  description,
  isOpen,
  maxWidthClassName = 'max-w-lg',
  onClose,
  title,
}: AdminFormModalProps) {
  const { t } = useI18n();
  const overlay = useOverlayPresence(isOpen);

  useEffect(() => {
    if (!isOpen || busy) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('[data-confirm-dialog="true"]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, isOpen, onClose]);

  if (!overlay.mounted) return null;

  const handleBackdropClick = () => {
    if (busy) return;
    onClose();
  };

  const content = (
    <div
      className={`fixed inset-0 flex cursor-pointer items-center justify-center bg-black/50 dark:bg-black/70 ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: ZIndex.modalBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
      onClick={handleBackdropClick}
    >
      <div
        aria-labelledby="admin-form-modal-title"
        aria-modal="true"
        className={`mx-4 flex max-h-[90vh] w-full cursor-default flex-col overflow-visible rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-gray-800 ${maxWidthClassName} ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
          <div className="min-w-0">
            <h2
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              id="admin-form-modal-title"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
            ) : null}
          </div>
          <HeaderIconButton
            aria-label={t('common.close')}
            disabled={busy}
            title={t('common.close')}
            type="button"
            onClick={onClose}
          >
            <Icon className="h-5 w-5" name="close" />
          </HeaderIconButton>
        </div>
        <div className="overflow-visible px-5 py-5">{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
