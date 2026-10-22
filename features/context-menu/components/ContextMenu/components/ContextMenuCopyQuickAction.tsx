'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { CopyFeedbackGlyph } from '@/components/CopyFeedbackGlyph';
import { useI18n } from '@/contexts/LanguageContext';
import { MENU_QUICK_ACTION } from '@/features/context-menu/contextMenuClasses';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';

// Tailwind v4: translate-* — отдельное свойство `translate`, не `transform`.
// truncate на каждом слое, а не на обёртке: overflow обёртки резал бы сдвиг подписи.
const LABEL_LAYER =
  'col-start-1 row-start-1 truncate transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]';

interface ContextMenuCopyQuickActionProps {
  ariaLabel: string;
  /** Glyph в покое вместо `idleName` (например логотип GitLab). */
  idle?: ReactNode;
  idleName?: string;
  label: string;
  /** Подсказка, когда копировать нечего (`value` пустой). */
  missingTitle?: string;
  title: string;
  /** Что уйдёт в буфер; пусто — кнопка неактивна. */
  value: string | null;
}

/**
 * Быстрое действие «скопировать» в шапке контекстного меню: после копирования
 * галка прорисовывается, подпись сменяется на «Готово», кнопка подсвечена.
 */
export function ContextMenuCopyQuickAction({
  ariaLabel,
  idle,
  idleName,
  label,
  missingTitle,
  title,
  value,
}: ContextMenuCopyQuickActionProps) {
  const { t } = useI18n();
  const { copied, copy } = useCopyFeedback();
  const disabled = !value;
  // Значение в подсказке: видно, что именно уйдёт в буфер.
  const tooltip = value ? `${title}: ${value}` : (missingTitle ?? title);

  return (
    <Button
      aria-label={disabled ? tooltip : ariaLabel}
      className={`${MENU_QUICK_ACTION} group transition-colors duration-200 disabled:cursor-not-allowed disabled:!opacity-40 disabled:hover:!bg-transparent ${
        copied ? '!bg-black/[0.06] !text-gray-900 dark:!bg-white/[0.1] dark:!text-gray-100' : ''
      }`}
      disabled={disabled}
      title={tooltip}
      type="button"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        if (value) {
          copy(value).catch(() => undefined);
        }
      }}
    >
      <span className="inline-flex transition-[scale] duration-150 group-active:scale-90">
        <CopyFeedbackGlyph copied={copied} idle={idle} idleName={idleName} />
      </span>
      <span
        aria-live="polite"
        className="grid max-w-full text-center text-[11px] font-medium leading-none"
      >
        <span
          aria-hidden={copied}
          className={`${LABEL_LAYER} ${copied ? '-translate-y-[3px] opacity-0' : 'translate-y-0 opacity-100'}`}
        >
          {label}
        </span>
        <span
          aria-hidden={!copied}
          className={`${LABEL_LAYER} ${copied ? 'translate-y-0 opacity-100' : 'translate-y-[3px] opacity-0'}`}
        >
          {t('sprintPlanner.contextMenu.copiedShort')}
        </span>
      </span>
    </Button>
  );
}
