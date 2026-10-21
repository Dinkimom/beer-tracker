'use client';

import type { BoardAvailabilityEventType, TechSprintType } from '@/types/quarterly';

import * as Popover from '@radix-ui/react-popover';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IsoDateRangePickerField } from '@/components/IsoDateRangePickerField';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_DIVIDER_COLOR,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  FLOATING_MENU_GLASS_SHELL,
  glassLensControlClass,
} from '@/features/context-menu/contextMenuClasses';
import { resolveAvailabilityDayRange } from '@/features/swimlane/utils/availabilitySegments';
import { QuickAddMenuCloseButton } from '@/features/task/components/TaskBar/components/quickAddMenu/QuickAddMenuCloseButton';

const EVENT_TYPES: { messageKey: string; value: BoardAvailabilityEventType }[] = [
  { messageKey: 'sprintPlanner.swimlane.availability.vacation', value: 'vacation' },
  { messageKey: 'sprintPlanner.swimlane.availability.sickLeave', value: 'sick_leave' },
  { messageKey: 'sprintPlanner.swimlane.availability.duty', value: 'duty' },
  { messageKey: 'sprintPlanner.swimlane.availability.techSprint', value: 'tech_sprint' },
];

const TECH_SPRINT_TYPES: { label: string; value: TechSprintType }[] = [
  { label: 'Web', value: 'web' },
  { label: 'Back', value: 'back' },
  { label: 'QA', value: 'qa' },
];

const POPOVER_WIDTH_PX = 340;
const NESTED_PICKER_Z_INDEX = ZIndex.modalNested;
const PILL_CLASS = '!h-8 !rounded-lg !px-3 text-xs';
/** Переключатель на стекле: линза, выбранный — синяя вуаль (как чипы фильтров сайдбара). */
const CHOICE_PILL_CLASS = `${PILL_CLASS} font-medium`;
const GHOST_PILL_CLASS = `${PILL_CLASS} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER}`;
const DELETE_ARM_SECONDS = 3;

interface AvailabilityEventValues {
  endDate: string;
  eventType: BoardAvailabilityEventType;
  startDate: string;
  techSprintSubtype?: TechSprintType;
}

interface AvailabilityEventPopoverProps {
  initial: AvailabilityEventValues;
  isEditing: boolean;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  onClose: () => void;
  onDelete?: () => Promise<void>;
  onSubmit: (values: AvailabilityEventValues) => Promise<void>;
}

/**
 * Создание и правка отсутствия прямо на дорожке: подсветка периода в колонках дней
 * и поповер с формой рядом с ней. Прозрачный бэкдроп блокирует доску; Escape и клик по нему — отмена.
 * Удаление — повторным кликом по той же кнопке; без второго клика она сама возвращается.
 */
export function AvailabilityEventPopover({
  initial,
  isEditing,
  sprintStartDate,
  sprintTimelineWorkingDays,
  onClose,
  onDelete,
  onSubmit,
}: AvailabilityEventPopoverProps) {
  const { t } = useI18n();
  const [pending, setPending] = useState<'delete' | 'save' | null>(null);
  const [deleteSecondsLeft, setDeleteSecondsLeft] = useState(0);
  const deleteArmed = deleteSecondsLeft > 0;
  const deleteConfirmRef = useRef<HTMLButtonElement>(null);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [eventType, setEventType] = useState<BoardAvailabilityEventType>(initial.eventType);
  const [techSprintSubtype, setTechSprintSubtype] = useState<TechSprintType>(
    initial.techSprintSubtype ?? 'web'
  );

  const totalDays = Math.max(1, sprintTimelineWorkingDays);
  const range = resolveAvailabilityDayRange({
    endDate,
    sprintStartDate,
    startDate,
    workingDaysCount: totalDays,
  }) ??
    resolveAvailabilityDayRange({
      endDate: initial.endDate,
      sprintStartDate,
      startDate: initial.startDate,
      workingDaysCount: totalDays,
    }) ?? { dayCount: 1, startDay: 0 };

  const submitting = pending != null;
  const needsTechSubtype = eventType === 'tech_sprint';
  const canSubmit = Boolean(startDate && endDate && startDate <= endDate) && !submitting;

  useEffect(() => {
    if (deleteArmed) {
      deleteConfirmRef.current?.focus();
    }
  }, [deleteArmed]);

  useEffect(() => {
    if (!deleteArmed || submitting) {
      return;
    }
    const timer = window.setTimeout(() => setDeleteSecondsLeft((left) => left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [deleteArmed, deleteSecondsLeft, submitting]);

  const requestClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setPending('save');
    try {
      await onSubmit({
        endDate,
        eventType,
        startDate,
        ...(needsTechSubtype ? { techSprintSubtype } : {}),
      });
      onClose();
    } finally {
      setPending(null);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete || submitting) {
      return;
    }
    if (!deleteArmed) {
      setDeleteSecondsLeft(DELETE_ARM_SECONDS);
      return;
    }
    setPending('delete');
    try {
      await onDelete();
      onClose();
    } catch {
      setDeleteSecondsLeft(0);
    } finally {
      setPending(null);
    }
  };

  return (
    <Popover.Root
      modal={false}
      open
      onOpenChange={(open) => {
        if (!open) {
          requestClose();
        }
      }}
    >
      <Popover.Anchor asChild>
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 top-0 bg-blue-500/10 ring-2 ring-inset ring-blue-500/50 transition-[left,width] duration-150 dark:bg-blue-400/10 dark:ring-blue-400/50"
          style={{
            left: `${(range.startDay / totalDays) * 100}%`,
            width: `${(range.dayCount / totalDays) * 100}%`,
            zIndex: ZIndex.contentInteractive,
          }}
        />
      </Popover.Anchor>
      <Popover.Portal>
        <div
          aria-hidden
          className="fixed inset-0"
          style={{ zIndex: ZIndex.modalBackdrop }}
          onClick={(event) => {
            event.stopPropagation();
            requestClose();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        />
      </Popover.Portal>
      <Popover.Portal>
        <Popover.Content
          align="start"
          avoidCollisions
          className={`relative font-sans outline-none ${FLOATING_MENU_GLASS_SHELL} ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={8}
          data-swimlane-availability-popover="true"
          side="bottom"
          sideOffset={6}
          style={{ width: POPOVER_WIDTH_PX, zIndex: ZIndex.modal }}
          onClick={(event) => event.stopPropagation()}
          onInteractOutside={(event) => {
            if (submitting) {
              event.preventDefault();
            }
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-1 px-3 pt-2.5">
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t(
                isEditing
                  ? 'sprintPlanner.swimlane.availability.popoverTitleEdit'
                  : 'sprintPlanner.swimlane.availability.popoverTitleCreate'
              )}
            </h2>
            <QuickAddMenuCloseButton disabled={submitting} onClose={requestClose} />
          </div>

          <div className="space-y-3 px-3 pb-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ds-text-muted">
                {t('sprintPlanner.swimlane.availability.typeLabel')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((item) => (
                  <Button
                    key={item.value}
                    aria-pressed={eventType === item.value}
                    className={`${CHOICE_PILL_CLASS} ${glassLensControlClass(eventType === item.value)}`}
                    disabled={submitting}
                    variant="outline"
                    onClick={() => setEventType(item.value)}
                  >
                    {t(item.messageKey)}
                  </Button>
                ))}
              </div>
            </div>

            {needsTechSubtype ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-ds-text-muted">
                  {t('sprintPlanner.swimlane.availability.techSprintSubtypeLabel')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TECH_SPRINT_TYPES.map((item) => (
                    <Button
                      key={item.value}
                      aria-pressed={techSprintSubtype === item.value}
                      className={`${CHOICE_PILL_CLASS} ${glassLensControlClass(techSprintSubtype === item.value)}`}
                      disabled={submitting}
                      variant="outline"
                      onClick={() => setTechSprintSubtype(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ds-text-muted">
                {t('sprintPlanner.swimlane.availability.periodLabel')}
              </span>
              <IsoDateRangePickerField
                contentZIndex={NESTED_PICKER_Z_INDEX}
                disabled={submitting}
                endDate={endDate}
                placeholder={t('sprintPlanner.swimlane.availability.periodPlaceholder')}
                startDate={startDate}
                surface="glass"
                onChange={(next) => {
                  setStartDate(next.startDate);
                  setEndDate(next.endDate);
                }}
              />
              <span className="text-xs text-ds-text-muted">
                {t('sprintPlanner.swimlane.availability.periodHint')}
              </span>
            </label>
          </div>

          <div className={`flex items-center justify-between gap-2 border-t px-3 py-2 ${CONTEXT_MENU_DIVIDER_COLOR}`}>
            {onDelete && deleteArmed ? (
              <Button
                key="delete-confirm"
                ref={deleteConfirmRef}
                className={`${PILL_CLASS} !border-red-600/25 !bg-red-600/10 font-semibold !text-red-800 hover:!bg-red-600/15 active:!bg-red-600/20 motion-safe:animate-[overlay-fade-enter_150ms_ease-out] dark:!border-red-400/35 dark:!bg-red-500/15 dark:!text-red-200 dark:hover:!bg-red-500/25 dark:active:!bg-red-500/30`}
                disabled={submitting}
                variant="dangerOutline"
                onClick={() => {
                  void handleDeleteClick();
                }}
              >
                {pending === 'delete' ? (
                  <Icon className="h-4 w-4 animate-spin" name="spinner" />
                ) : null}
                <span className="tabular-nums">
                  {t('sprintPlanner.swimlane.availability.deleteConfirmCountdown', {
                    seconds: deleteSecondsLeft,
                  })}
                </span>
              </Button>
            ) : null}
            {onDelete && !deleteArmed ? (
              <Button
                key="delete"
                className={`${PILL_CLASS} text-red-600 hover:!bg-red-500/[0.08] active:!bg-red-500/[0.14] motion-safe:animate-[overlay-fade-enter_150ms_ease-out] dark:text-red-400 dark:hover:!bg-red-400/[0.12] dark:active:!bg-red-400/[0.18]`}
                disabled={submitting}
                variant="ghost"
                onClick={() => {
                  void handleDeleteClick();
                }}
              >
                {t('common.delete')}
              </Button>
            ) : null}
            {onDelete ? null : <span />}
            <div className="flex items-center gap-1.5">
              <Button className={GHOST_PILL_CLASS} disabled={submitting} variant="ghost" onClick={requestClose}>
                {t('common.cancel')}
              </Button>
              <Button
                className={PILL_CLASS}
                disabled={!canSubmit}
                variant="primary"
                onClick={() => {
                  void handleSubmit();
                }}
              >
                {pending === 'save' ? <Icon className="h-4 w-4 animate-spin" name="spinner" /> : null}
                {t(isEditing ? 'common.save' : 'sprintPlanner.swimlane.availability.add')}
              </Button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
