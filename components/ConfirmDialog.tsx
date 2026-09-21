'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import {
  OVERLAY_BACKDROP_ENTER,
  OVERLAY_CENTERED_DIALOG_ANIMATION,
} from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

export interface ConfirmDialogPromptOptions {
  cancelText?: string;
  confirmText?: string;
  loadingText?: string;
  title?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmDialogProps {
  cancelText?: string;
  confirmText?: string;
  loading?: boolean;
  loadingText?: string;
  message: string;
  open: boolean;
  title: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText,
  cancelText,
  loadingText,
  loading = false,
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const confirmLabel = confirmText ?? t('common.confirm');
  const cancelLabel = cancelText ?? t('common.cancel');
  const loadingLabel = loadingText ?? 'Удаляем...';
  const handleConfirm = useCallback(() => {
    if (loading) return;
    onConfirm();
  }, [loading, onConfirm]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        {/* Обёртка fixed inset-0 гарантирует, что бэкдроп перекрывает весь viewport при любом контейнере */}
        <div
          aria-hidden
          className={`fixed inset-0 ${OVERLAY_BACKDROP_ENTER}`}
          style={{ zIndex: ZIndex.modalConfirmBackdrop }}
        >
          <Dialog.Overlay className="absolute inset-0 bg-black/50 dark:bg-black/70" />
        </div>
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md ${OVERLAY_CENTERED_DIALOG_ANIMATION}`}
          data-confirm-dialog="true"
          style={{ zIndex: ZIndex.modalConfirm }}
        >
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </Dialog.Description>
          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button disabled={loading} type="button" variant="outline">
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              disabled={loading}
              type="button"
              variant={variant === 'destructive' ? 'danger' : 'primary'}
              onClick={handleConfirm}
            >
              {loading ? (
                <>
                  <Icon className="h-4 w-4 shrink-0 animate-spin" name="spinner" />
                  {loadingLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Хук для использования диалога подтверждения
 * Возвращает функцию, которая показывает диалог и возвращает Promise<boolean>
 */
export function useConfirmDialog() {
  const { t } = useI18n();
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    loadingText?: string;
    variant?: 'default' | 'destructive';
    onConfirmAction?: () => Promise<void> | void;
    loading?: boolean;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (message: string, options?: ConfirmDialogPromptOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          title: options?.title || t('common.confirmDialogTitle'),
          message,
          confirmText: options?.confirmText,
          cancelText: options?.cancelText,
          loadingText: options?.loadingText,
          variant: options?.variant,
          onConfirmAction: undefined,
          loading: false,
          resolve,
        });
      });
    },
    [t]
  );

  const handleConfirm = useCallback(() => {
    if (dialogState) {
      if (dialogState.onConfirmAction) {
        setDialogState((prev) => (prev ? { ...prev, loading: true } : prev));
        Promise.resolve(dialogState.onConfirmAction())
          .then(() => {
            dialogState.resolve(true);
            setDialogState(null);
          })
          .catch(() => {
            setDialogState((prev) => (prev ? { ...prev, loading: false } : prev));
          });
        return;
      }
      dialogState.resolve(true);
      setDialogState(null);
    }
  }, [dialogState]);

  const handleCancel = useCallback(() => {
    if (dialogState?.loading) return;
    if (dialogState) {
      dialogState.resolve(false);
      setDialogState(null);
    }
  }, [dialogState]);

  const dialogElement = dialogState ? (
    <ConfirmDialog
      cancelText={dialogState.cancelText}
      confirmText={dialogState.confirmText}
      loading={dialogState.loading}
      loadingText={dialogState.loadingText}
      message={dialogState.message}
      open={dialogState.open}
      title={dialogState.title}
      variant={dialogState.variant}
      onConfirm={handleConfirm}
      onOpenChange={(open) => {
        if (!open && !dialogState.loading) {
          handleCancel();
        }
      }}
    />
  ) : null;

  const DialogComponent =
    dialogElement && typeof document !== 'undefined' && document.body
      ? createPortal(dialogElement, document.body)
      : dialogElement;

  const confirmWithAction = useCallback(
    (
      message: string,
      onConfirmAction: () => Promise<void> | void,
      options?: ConfirmDialogPromptOptions
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          title: options?.title || t('common.confirmDialogTitle'),
          message,
          confirmText: options?.confirmText,
          cancelText: options?.cancelText,
          loadingText: options?.loadingText,
          variant: options?.variant,
          onConfirmAction,
          loading: false,
          resolve,
        });
      });
    },
    [t]
  );

  return { confirm, confirmWithAction, DialogComponent };
}

