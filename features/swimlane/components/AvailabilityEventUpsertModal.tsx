'use client';

import type { BoardAvailabilityEventType, TechSprintType } from '@/types/quarterly';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { CustomSelect, type CustomSelectOption } from '@/components/CustomSelect';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { IsoDateRangePickerField } from '@/components/IsoDateRangePickerField';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

const EVENT_OPTIONS: CustomSelectOption<BoardAvailabilityEventType>[] = [
  { value: 'vacation', label: 'Отпуск' },
  { value: 'tech_sprint', label: 'Техспринт' },
  { value: 'sick_leave', label: 'Больничный' },
  { value: 'duty', label: 'Дежурство' },
];

const TECH_OPTIONS: CustomSelectOption<TechSprintType>[] = [
  { value: 'web', label: 'Web' },
  { value: 'back', label: 'Back' },
  { value: 'qa', label: 'QA' },
];

interface AvailabilityEventUpsertSubmitArgs {
  endDate: string;
  eventType: BoardAvailabilityEventType;
  startDate: string;
  techSprintSubtype?: TechSprintType;
}

interface AvailabilityEventUpsertModalProps {
  initial?: {
    endDate: string;
    eventType: BoardAvailabilityEventType;
    startDate: string;
    techSprintSubtype?: TechSprintType;
  } | null;
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onDelete?: () => Promise<void> | void;
  onSubmit: (args: AvailabilityEventUpsertSubmitArgs) => Promise<void> | void;
}

export function AvailabilityEventUpsertModal({
  initial = null,
  isOpen,
  title,
  onClose,
  onDelete,
  onSubmit,
}: AvailabilityEventUpsertModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState<BoardAvailabilityEventType>('vacation');
  const [techSprintSubtype, setTechSprintSubtype] = useState<TechSprintType>('web');

  useEffect(() => {
    if (!isOpen) return;
    setStartDate(initial?.startDate ?? '');
    setEndDate(initial?.endDate ?? '');
    setEventType(initial?.eventType ?? 'vacation');
    setTechSprintSubtype(initial?.techSprintSubtype ?? 'web');
  }, [isOpen, initial?.endDate, initial?.eventType, initial?.startDate, initial?.techSprintSubtype]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-confirm-dialog="true"]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const needsTechSubtype = eventType === 'tech_sprint';
  const canSubmit =
    Boolean(startDate && endDate && (!needsTechSubtype || techSprintSubtype)) && !submitting;

  const submitLabel = useMemo(() => (initial ? 'Сохранить' : 'Добавить'), [initial]);

  const overlay = useOverlayPresence(isOpen);
  if (!overlay.mounted) return null;

  const content = (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 cursor-pointer ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: ZIndex.modalNestedBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col cursor-default ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h3>
          <HeaderIconButton aria-label="Закрыть" title="Закрыть" onClick={onClose}>
            <Icon className="h-5 w-5" name="close" />
          </HeaderIconButton>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-300">Тип</span>
            <CustomSelect<BoardAvailabilityEventType>
              className="[&_button]:!h-10"
              disabled={submitting}
              menuZIndex={ZIndex.modalNested + 1}
              options={EVENT_OPTIONS}
              value={eventType}
              onChange={setEventType}
            />
          </label>

          {needsTechSubtype ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600 dark:text-gray-300">Направление техспринта</span>
              <CustomSelect<TechSprintType>
                className="[&_button]:!h-10"
                disabled={submitting}
                menuZIndex={ZIndex.modalNested + 1}
                options={TECH_OPTIONS}
                value={techSprintSubtype}
                onChange={setTechSprintSubtype}
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-300">Период</span>
            <IsoDateRangePickerField
              contentZIndex={ZIndex.modalNested + 2}
              disabled={submitting}
              endDate={endDate}
              placeholder="ДД.ММ.ГГГГ — ДД.ММ.ГГГГ"
              startDate={startDate}
              onChange={({ endDate: e, startDate: s }) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
          </label>

          <p className="text-xs text-ds-text-muted">
            Первый и последний день периода включаются в интервал.
          </p>

          <div className="flex items-center justify-between gap-2 pt-1">
            {onDelete ? (
              <Button
                className="!h-10 text-red-600 hover:!bg-red-50 dark:text-red-400 dark:hover:!bg-red-950/40"
                disabled={submitting}
                type="button"
                variant="ghost"
                onClick={() => {
                  void onDelete();
                }}
              >
                Удалить
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center justify-end gap-2">
            <Button
              className="!h-10 hover:!bg-gray-100 dark:hover:!bg-gray-700"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              className="!h-10"
              disabled={!canSubmit}
              type="button"
              variant="primary"
              onClick={async () => {
                if (!startDate || !endDate) return;
                setSubmitting(true);
                try {
                  await onSubmit({
                    startDate,
                    endDate,
                    eventType,
                    ...(needsTechSubtype ? { techSprintSubtype } : {}),
                  });
                  onClose();
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? <Icon className="h-4 w-4 animate-spin" name="spinner" /> : null}
              {submitLabel}
            </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
