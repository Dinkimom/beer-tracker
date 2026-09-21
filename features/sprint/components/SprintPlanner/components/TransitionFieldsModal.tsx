'use client';

import type { TransitionField } from '@/lib/beerTrackerApi';
import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { StatusTag } from '@/components/StatusTag';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

import {
  buildTransitionInitialValues,
  buildTransitionSubmitBody,
  renderTransitionFieldInput,
  validateTransitionRequiredFields,
} from './transitionFieldsModalHelpers';

interface TransitionFieldsModalProps {
  fields: TransitionField[];
  isOpen: boolean;
  sprints?: SprintListItem[];
  targetStatusDisplay?: string;
  targetStatusKey?: string;
  task?: Task | null;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

export function TransitionFieldsModal({
  fields,
  isOpen,
  sprints = [],
  task,
  targetStatusDisplay,
  targetStatusKey,
  onClose,
  onSubmit,
}: TransitionFieldsModalProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildTransitionInitialValues(fields, task));
  }, [isOpen, task, fields]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const validationError = validateTransitionRequiredFields(fields, values);
      if (validationError) {
        setError(validationError);
        return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        await onSubmit(buildTransitionSubmitBody(fields, values));
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('task.transitionFields.submitError'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [fields, values, onSubmit, onClose, t]
  );

  const overlay = useOverlayPresence(isOpen);
  if (!overlay.mounted) return null;

  const fromStatus = task?.originalStatus?.trim() || null;
  const toStatusKey = targetStatusKey?.trim() || targetStatusDisplay?.trim() || null;
  const toStatusLabel = targetStatusDisplay?.trim() || undefined;
  const hasStatusPath = Boolean(fromStatus || toStatusKey);
  const statusPathAria =
    fromStatus && toStatusKey
      ? t('task.transitionFields.statusPathAria', {
          from: fromStatus,
          to: toStatusLabel || toStatusKey,
        })
      : undefined;

  const inputClassName =
    'mt-1 block min-h-[38px] rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:ring-blue-500';

  const renderField = (field: TransitionField) =>
    renderTransitionFieldInput({
      field,
      handleChange,
      inputClassName,
      sprints,
      value: values[field.id] ?? '',
    });

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70 ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: ZIndex.modalBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800 ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        onClick={(e) => e.stopPropagation()}
      >
        <form className="flex min-h-0 max-h-[90vh] flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('task.transitionFields.title')}
            </h2>
            {hasStatusPath ? (
              <div
                aria-label={statusPathAria}
                className="mb-4 flex flex-wrap items-center gap-2"
              >
                {fromStatus ? (
                  <>
                    <StatusTag status={fromStatus} statusColorKey={task?.statusColorKey} />
                    {toStatusKey ? (
                      <span aria-hidden className="text-gray-400 dark:text-gray-500">
                        →
                      </span>
                    ) : null}
                  </>
                ) : null}
                {toStatusKey ? (
                  <StatusTag label={toStatusLabel} status={toStatusKey} />
                ) : null}
              </div>
            ) : null}
            {task && (
              <div className="mb-4">
                <TaskCard
                  className="pointer-events-auto"
                  isContextMenuOpen={false}
                  isDragging={false}
                  isResizing={false}
                  isSelected={false}
                  task={task}
                  variant="sidebar"
                  widthPercent={100}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              </div>
            )}
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.id}>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    htmlFor={field.id}
                  >
                    {field.display}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
          <div className="flex flex-shrink-0 justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
            <Button className="text-sm rounded-md" variant="secondary" onClick={onClose}>
              {t('task.transitionFields.cancel')}
            </Button>
            <Button
              className="text-sm rounded-md disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
              variant="primary"
            >
              {isSubmitting
                ? t('task.transitionFields.submitting')
                : t('task.transitionFields.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
