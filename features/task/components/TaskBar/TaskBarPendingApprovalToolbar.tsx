'use client';

import type { MouseEvent } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

interface TaskBarPendingApprovalToolbarProps {
  commentId: string;
  onApprove?: (commentId: string) => void;
  onReject?: (commentId: string) => void;
}

const ACTION_BUTTON_CLASS =
  '!h-6 !w-6 !min-h-0 !min-w-0 !justify-center !p-0 shadow-sm transition-colors duration-200 focus-visible:outline-none';

function preventCardGesture(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function handleActionClick(event: MouseEvent, run?: () => void): void {
  event.preventDefault();
  event.stopPropagation();
  run?.();
}

export function TaskBarPendingApprovalToolbar({
  commentId,
  onApprove,
  onReject,
}: TaskBarPendingApprovalToolbarProps) {
  const { t } = useI18n();
  return (
    <div
      className="pointer-events-auto absolute right-0 top-full mt-1 flex items-center gap-1"
      data-agent-pending-approval=""
      style={{ zIndex: ZIndex.stickyElevated }}
      onMouseDown={preventCardGesture}
    >
      <Button
        className={`${ACTION_BUTTON_CLASS} pointer-events-none !w-auto !cursor-default gap-1 !px-1.5 text-[11px] font-medium`}
        tabIndex={-1}
        type="button"
        variant="outline"
      >
        <Icon className="h-3 w-3" name="sparkles" />
        {t('comments.agentDraft')}
      </Button>
      {onApprove ? (
        <Button
          aria-label={t('comments.agentApproveAria')}
          className={`${ACTION_BUTTON_CLASS} text-green-700/90 dark:text-green-400/90 hover:!border-green-600/25 hover:!bg-green-500/[0.12] dark:hover:!border-green-400/30 dark:hover:!bg-green-400/[0.12]`}
          title={t('comments.agentApproveAria')}
          type="button"
          variant="outline"
          onClick={(event) => handleActionClick(event, () => onApprove(commentId))}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="check" />
        </Button>
      ) : null}
      {onReject ? (
        <Button
          aria-label={t('comments.agentRejectAria')}
          className={`${ACTION_BUTTON_CLASS} text-red-600/90 dark:text-red-400/90 hover:!border-red-600/25 hover:!bg-red-500/[0.1] dark:hover:!border-red-400/30 dark:hover:!bg-red-400/[0.1]`}
          title={t('comments.agentRejectAria')}
          type="button"
          variant="outline"
          onClick={(event) => handleActionClick(event, () => onReject(commentId))}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="x" />
        </Button>
      ) : null}
    </div>
  );
}
