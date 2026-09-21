'use client';

import type { SprintListItem } from '@/types/tracker';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

type SprintDurationWeeks = 1 | 2;

const SPRINT_DURATION_OPTIONS: SprintDurationWeeks[] = [1, 2];
const DEFAULT_SPRINT_DURATION_WEEKS: SprintDurationWeeks = 2;

interface CreateSprintModalProps {
  isOpen: boolean;
  sprints: SprintListItem[];
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7 - 1);
  return result;
}

/**
 * Генерирует следующее название спринта на основе последнего.
 * Формат названий: "Prefix ГГНН" где ГГ - год, НН - номер.
 * Например: "Booking 2501" → "Booking 2502"
 */
function generateNextSprintName(sprints: SprintListItem[], copySuffix: string): string {
  if (sprints.length === 0) {
    const year = new Date().getFullYear() % 100;
    return `Sprint ${year}01`;
  }

  const sortedSprints = [...sprints].sort((a, b) => b.id - a.id);
  const lastSprint = sortedSprints[0];
  const lastName = lastSprint.name;

  const match = lastName.match(/^(.+?)(\d{4})$/);

  if (match) {
    const prefix = match[1].trim();
    const numberPart = parseInt(match[2], 10);
    const nextNumber = numberPart + 1;
    return `${prefix} ${nextNumber}`;
  }

  return `${lastName} (${copySuffix})`;
}

function getSprintDurationOptionClassName(isSelected: boolean): string {
  const base =
    'cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-800';

  return isSelected
    ? `${base} border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100`
    : `${base} border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700/80`;
}

export function CreateSprintModal({
  isOpen,
  onClose,
  onSubmit,
  sprints,
}: CreateSprintModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationWeeks, setDurationWeeks] = useState<SprintDurationWeeks>(
    DEFAULT_SPRINT_DURATION_WEEKS,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const endDate = useMemo(() => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = addWeeks(start, durationWeeks);
    return formatDateForInput(end);
  }, [durationWeeks, startDate]);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + daysUntilMonday);

      setStartDate(formatDateForInput(nextMonday));
      setDurationWeeks(DEFAULT_SPRINT_DURATION_WEEKS);
      setName(generateNextSprintName(sprints, t('backlog.createSprintModal.nameCopySuffix')));
    }
  }, [isOpen, sprints, t]);

  const handleDurationKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentWeeks: SprintDurationWeeks,
  ) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const currentIndex = SPRINT_DURATION_OPTIONS.indexOf(currentWeeks);
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + SPRINT_DURATION_OPTIONS.length) %
      SPRINT_DURATION_OPTIONS.length;
    setDurationWeeks(SPRINT_DURATION_OPTIONS[nextIndex]!);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        startDate,
        endDate,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create sprint:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const overlay = useOverlayPresence(isOpen);
  if (!overlay.mounted) return null;

  const content = (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: ZIndex.modalBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">
              {t('backlog.createSprintModal.title')}
            </h2>

            {/* Название спринта */}
            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                htmlFor="sprint-name"
              >
                {t('backlog.createSprintModal.sprintNameLabel')}
              </label>
              <Input
                autoFocus
                className="px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                id="sprint-name"
                placeholder={t('backlog.createSprintModal.namePlaceholder')}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Продолжительность */}
            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                id="sprint-duration-label"
              >
                {t('backlog.createSprintModal.durationLabel')}
              </label>
              <div
                aria-labelledby="sprint-duration-label"
                className="grid w-full grid-cols-2 gap-2"
                role="radiogroup"
              >
                {SPRINT_DURATION_OPTIONS.map((weeks) => {
                  const isSelected = durationWeeks === weeks;

                  return (
                    <button
                      key={weeks}
                      aria-checked={isSelected}
                      className={getSprintDurationOptionClassName(isSelected)}
                      role="radio"
                      type="button"
                      onClick={() => setDurationWeeks(weeks)}
                      onKeyDown={(event) => handleDurationKeyDown(event, weeks)}
                    >
                      {weeks === 1
                        ? t('backlog.createSprintModal.durationOneWeek')
                        : t('backlog.createSprintModal.durationTwoWeeks')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Начало — конец */}
            <div className="mb-5">
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                {t('backlog.createSprintModal.dateRangeLabel')}
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    className="px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <span className="text-gray-500 dark:text-gray-400">—</span>
                <div className="relative flex-1">
                  <Input
                    className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden"
                    readOnly
                    title={t('backlog.createSprintModal.endDateTitle', {
                      date: formatDateForDisplay(endDate),
                    })}
                    type="date"
                    value={endDate}
                  />
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3">
              <Button
                className="flex-1 py-2.5 text-sm disabled:cursor-not-allowed"
                disabled={isSubmitting}
                fullWidth
                variant="secondary"
                onClick={onClose}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={!name.trim() || !startDate || isSubmitting}
                fullWidth
                type="submit"
                variant="primary"
              >
                {isSubmitting && (
                  <Icon className="w-4 h-4 animate-spin" name="spinner" />
                )}
                {t('backlog.createSprintModal.submit')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
