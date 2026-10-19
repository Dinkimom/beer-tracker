'use client';

import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import type { MouseEvent, ReactNode } from 'react';

import { McpOAuthClientMark } from '@/app/mcp/oauth/consent/McpOAuthClientMark';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
} from '@/features/context-menu/contextMenuClasses';

interface TaskBarPendingApprovalToolbarProps {
  clientBrand?: McpOAuthClientBrand;
  commentId: string;
  label?: string;
  labelClassName?: string;
  labelIcon?: string | null;
  placement?: 'card' | 'inline';
  onApprove?: (commentId: string) => void;
  onReject?: (commentId: string) => void;
}

const ICON_BUTTON_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !w-6 !min-h-0 !min-w-0 !justify-center !rounded-md !p-0`;
const DETAILS_HIT_CLASS =
  'inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-500/[0.1] hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100';

function preventCardGesture(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function handleActionClick(event: MouseEvent, run?: () => void): void {
  event.preventDefault();
  event.stopPropagation();
  run?.();
}

function renderBrandMark(brand: McpOAuthClientBrand | undefined, caption: string): ReactNode {
  if (brand) {
    return <McpOAuthClientMark brand={brand} compact label={caption} />;
  }
  return <Icon className="h-3.5 w-3.5 shrink-0" name="sparkles" />;
}

function renderInlineCaption(input: {
  brand?: McpOAuthClientBrand;
  caption: string;
  labelClassName?: string;
  labelIcon?: string | null;
}): ReactNode {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 px-0.5 text-[11px] font-medium text-gray-700 dark:text-gray-200">
      {renderBrandMark(input.brand, input.caption)}
      {input.labelIcon ? (
        <Icon className={`h-3 w-3 shrink-0 ${input.labelClassName ?? ''}`} name={input.labelIcon} />
      ) : null}
      <span className={`shrink-0 ${input.labelClassName ?? ''}`}>{input.caption}</span>
    </span>
  );
}

function renderCardCaption(input: {
  brand?: McpOAuthClientBrand;
  caption: string;
  detailsAria: string;
  labelClassName?: string;
  labelIcon?: string | null;
}): ReactNode {
  const brandMark = renderBrandMark(input.brand, input.caption);
  if (!input.labelIcon) {
    return (
      <span className="inline-flex h-6 shrink-0 items-center px-0.5 text-gray-700 dark:text-gray-200">
        <TextTooltip content={input.caption} delayDuration={200} side="top" sideOffset={6}>
          <button
            aria-label={input.detailsAria}
            className={DETAILS_HIT_CLASS}
            type="button"
            onClick={preventCardGesture}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {brandMark}
          </button>
        </TextTooltip>
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 px-0.5 text-gray-700 dark:text-gray-200">
      {brandMark}
      <TextTooltip content={input.caption} delayDuration={200} side="top" sideOffset={6}>
        <button
          aria-label={input.detailsAria}
          className={DETAILS_HIT_CLASS}
          type="button"
          onClick={preventCardGesture}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className={`h-3.5 w-3.5 ${input.labelClassName ?? ''}`} name={input.labelIcon} />
        </button>
      </TextTooltip>
    </span>
  );
}

export function TaskBarPendingApprovalToolbar({
  clientBrand,
  commentId,
  label,
  labelClassName,
  labelIcon,
  onApprove,
  onReject,
  placement = 'card',
}: TaskBarPendingApprovalToolbarProps) {
  const { t } = useI18n();
  const caption = label ?? t('comments.agentDraft');
  const placementClass =
    placement === 'inline'
      ? 'pointer-events-auto ml-6 mt-1 w-fit'
      : 'pointer-events-auto absolute right-0 top-full mt-1 w-max max-w-none whitespace-nowrap';
  return (
    <div
      className={`agent-pending-approval ${placementClass} flex items-center gap-0.5 py-0.5 pl-1.5 pr-0.5 ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      data-agent-pending-approval=""
      style={{ zIndex: ZIndex.stickyElevated }}
      onMouseDown={preventCardGesture}
    >
      {placement === 'inline'
        ? renderInlineCaption({
            brand: clientBrand,
            caption,
            labelClassName,
            labelIcon,
          })
        : renderCardCaption({
            brand: clientBrand,
            caption,
            detailsAria: t('comments.agentDetailsAria'),
            labelClassName,
            labelIcon,
          })}
      {onApprove ? (
        <Button
          aria-label={t('comments.agentApproveAria')}
          className={`${ICON_BUTTON_CLASS} text-green-700/90 hover:!bg-green-500/[0.12] dark:text-green-400/90 dark:hover:!bg-green-400/[0.12]`}
          title={t('comments.agentApproveAria')}
          type="button"
          variant="ghost"
          onClick={(event) => handleActionClick(event, () => onApprove(commentId))}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="check" />
        </Button>
      ) : null}
      {onReject ? (
        <Button
          aria-label={t('comments.agentRejectAria')}
          className={`${ICON_BUTTON_CLASS} text-red-600/90 hover:!bg-red-500/[0.1] dark:text-red-400/90 dark:hover:!bg-red-400/[0.1]`}
          title={t('comments.agentRejectAria')}
          type="button"
          variant="ghost"
          onClick={(event) => handleActionClick(event, () => onReject(commentId))}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="x" />
        </Button>
      ) : null}
    </div>
  );
}
