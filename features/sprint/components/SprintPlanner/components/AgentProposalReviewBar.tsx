'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
} from '@/features/context-menu/contextMenuClasses';

import { AgentPendingNavigator } from './AgentPendingNavigator';

const ACTION_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !gap-1.5 !rounded-md !px-2 !py-0 text-xs font-medium`;

interface AgentProposalReviewBarProps {
  /** Своё перед ✓/✗: на квартале — «не применяется» и показ черновика. */
  children?: ReactNode;
  disabled?: boolean;
  /** Сколько пунктов драфта ждёт решения: «‹ 1 / N ›». */
  total: number;
  /** Нет — «Принять все» не показывается (драфт больше не применяется). */
  onApproveAll?: () => void;
  onRejectAll: () => void;
  /** Часть пунктов не смонтирована (цели в закрытом сайдбаре): показать их перед переходом. */
  onRevealHidden?: () => void;
}

/**
 * Строка ревью драфта агента «‹ 1/2 › ✓ ✗» — одна на доске спринта и в квартальном плане.
 * Пункты по одному решают их ✓/✗ на доске; здесь — переход между ними и решение обо всех сразу.
 */
export function AgentProposalReviewBar({
  children,
  disabled = false,
  total,
  onApproveAll,
  onRejectAll,
  onRevealHidden,
}: AgentProposalReviewBarProps) {
  const { t } = useI18n();
  return (
    <div
      className={`mx-auto flex w-fit items-center justify-center gap-0.5 px-1 py-1 !rounded-xl ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      role="toolbar"
    >
      <AgentPendingNavigator total={total} onRevealHidden={onRevealHidden} />
      {children}
      {onApproveAll ? (
        <Button
          aria-label={t('comments.agentApproveAll')}
          className={`${ACTION_CLASS} text-green-700 hover:!bg-green-500/[0.12] dark:text-green-400 dark:hover:!bg-green-400/[0.12]`}
          disabled={disabled}
          type="button"
          variant="ghost"
          onClick={onApproveAll}
        >
          <Icon className="h-3.5 w-3.5" name="check" />
          <span>{t('comments.agentApproveAll')}</span>
        </Button>
      ) : null}
      <Button
        aria-label={t('comments.agentRejectAll')}
        className={`${ACTION_CLASS} text-red-600 hover:!bg-red-500/[0.1] dark:text-red-400 dark:hover:!bg-red-400/[0.1]`}
        disabled={disabled}
        type="button"
        variant="ghost"
        onClick={onRejectAll}
      >
        <Icon className="h-3.5 w-3.5" name="x" />
        <span>{t('comments.agentRejectAll')}</span>
      </Button>
    </div>
  );
}
