'use client';

import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { AgentSessionTargetKind } from '@/lib/agentSessions/agentSession';

import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { CARD_FLOATING_TOOLBAR_NEUTRAL_BUTTON_CLASS } from '@/features/context-menu/components/CardFloatingToolbar';
import { collectUsedAgentMentions } from '@/lib/agentSessions/agentMentions';
import { agentSessionTargetKey } from '@/lib/agentSessions/agentSession';

import { useAgentSessions } from '../hooks/useAgentSessions';

import { AgentComposer } from './AgentComposer';
import { DraftItemCommentThread } from './DraftItemCommentThread';

/** 💬 в тулбаре пункта драфта агента: комментарий в сессию, агент учтёт его при переделке. */
export function DraftItemCommentButton({
  sprintId,
  targetId,
  targetKind,
  targetLabel,
}: {
  sprintId: number | null | undefined;
  targetId: string;
  targetKind: AgentSessionTargetKind;
  /** Как пункт подписан в сессии (ключ задачи, текст цели или заметки). */
  targetLabel?: string;
}) {
  const { t } = useI18n();
  const sessions = useAgentSessions(sprintId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<AgentMention[]>([]);
  if (sprintId == null) {
    return null;
  }
  const items = sessions.itemComments.get(agentSessionTargetKey(targetKind, targetId)) ?? [];
  const openCount = items.filter((item) => item.open).length;

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || !sessions.active || sessions.posting) {
      return;
    }
    sessions
      .post({
        kind: 'comment',
        mentions: collectUsedAgentMentions(trimmed, mentions),
        target: { id: targetId, kind: targetKind, label: targetLabel },
        text: trimmed,
      })
      .then(() => {
        setText('');
        setMentions([]);
      })
      .catch(() => toast.error(t('agentSession.sendFailed')));
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          aria-label={
            openCount > 0
              ? t('agentSession.commentCountAria', { count: openCount })
              : t('agentSession.commentAria')
          }
          className={`${CARD_FLOATING_TOOLBAR_NEUTRAL_BUTTON_CLASS} relative`}
          data-draft-item-comment-trigger=""
          type="button"
          variant="ghost"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="comment" />
          {openCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-[14px] rounded-full bg-blue-600 px-1 text-[9px] font-semibold leading-[14px] text-white">
              {openCount}
            </span>
          ) : null}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className={`w-[min(100vw-2rem,22rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
          sideOffset={6}
          style={{ zIndex: ZIndex.popupContent }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <h3 className="mb-2 text-xs font-semibold text-gray-900 dark:text-gray-100">
            {t('agentSession.threadTitle')}
          </h3>
          <DraftItemCommentThread
            items={items}
            onWithdraw={(messageId) => {
              sessions.withdraw(messageId).catch(() => undefined);
            }}
          />
          {sessions.active ? (
            <div className="mt-2">
              <AgentComposer
                autoFocus
                disabled={sessions.posting}
                mentions={mentions}
                placeholder={t('agentSession.placeholder')}
                sprintId={sprintId}
                text={text}
                onMentionsChange={setMentions}
                onSubmit={submit}
                onTextChange={setText}
              />
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">{t('agentSession.noSession')}</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
