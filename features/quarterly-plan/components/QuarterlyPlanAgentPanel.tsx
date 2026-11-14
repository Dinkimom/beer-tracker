'use client';

import type { AgentSession, AgentSessionUserMessagePayload } from '@/lib/agentSessions/agentSession';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_MENU_SHELL, FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { AgentSessionConversation } from '@/features/sprint/components/SprintPlanner/components/AgentSessionConversation';

const NEW_SESSION = 'new';

interface QuarterlyPlanAgentPanelProps {
  busy: boolean;
  /** Сессия, в которой лежит текущий черновик: в ней можно попросить переделать. */
  draftSessionId: string | null;
  sessions: readonly AgentSession[];
  onClose: () => void;
  onSend: (input: AgentSessionUserMessagePayload & { sessionId: string | null }) => Promise<unknown>;
}

/**
 * Работа с агентом по квартальному плану (QM11): сессии те же, что на доске спринта, — просьба, ответы агента,
 * черновик, «переделать». Первое сообщение без выбранной сессии создаёт новую.
 */
export function QuarterlyPlanAgentPanel({ busy, draftSessionId, sessions, onClose, onSend }: QuarterlyPlanAgentPanelProps) {
  const { t } = useI18n();
  const openSessions = sessions.filter((session) => session.status !== 'closed');
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState('');
  const selectedId = picked ?? draftSessionId ?? openSessions[0]?.id ?? NEW_SESSION;
  const session = sessions.find((item) => item.id === selectedId) ?? null;

  const send = (kind: 'message' | 'redo') => {
    const value = text.trim();
    if (kind === 'message' && !value) return;
    onSend({ kind, sessionId: session?.id ?? null, text: value })
      .then((created) => {
        setText('');
        // Новая сессия: дальше пишем в неё.
        if (!session && created && typeof created === 'object' && 'id' in created) setPicked(String(created.id));
      })
      .catch(() => undefined);
  };

  return (
    <div
      className={`absolute bottom-24 right-3 top-3 flex w-[380px] max-w-[calc(100%-24px)] flex-col gap-2 p-3 !rounded-xl ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      style={{ zIndex: ZIndex.floatingControls }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" name="sparkles" />
        <select
          aria-label={t('quarterlyPlan.agent.sessions')}
          className="min-w-0 flex-1 cursor-pointer truncate rounded-md border border-ds-border-subtle bg-transparent px-2 py-1 text-sm text-gray-900 transition-colors hover:bg-black/[0.04] dark:text-gray-100 dark:hover:bg-white/10"
          value={selectedId}
          onChange={(event) => setPicked(event.target.value)}
        >
          <option value={NEW_SESSION}>{t('quarterlyPlan.agent.newSession')}</option>
          {openSessions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id === draftSessionId ? `✦ ${item.title}` : item.title}
            </option>
          ))}
        </select>
        <HeaderIconButton title={t('common.close')} onClick={onClose}>
          <Icon className="h-4 w-4" name="x" />
        </HeaderIconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AgentSessionConversation
          empty={t('quarterlyPlan.agent.empty')}
          messages={session?.messages ?? []}
          sessionId={session?.id}
          status={session?.status}
          onPickOption={(option) => {
            if (session) onSend({ kind: 'message', sessionId: session.id, text: option }).catch(() => undefined);
          }}
        />
      </div>
      <textarea
        className="min-h-[72px] w-full resize-none rounded-md border border-ds-border-subtle bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder:text-ds-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-100"
        disabled={busy}
        placeholder={t('quarterlyPlan.agent.placeholder')}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) send('message');
        }}
      />
      <div className="flex justify-end gap-2">
        {session && session.id === draftSessionId ? (
          <Button className="h-8 !px-2.5 !py-0" disabled={busy} variant="outline" onClick={() => send('redo')}>
            {t('quarterlyPlan.agent.redo')}
          </Button>
        ) : null}
        <Button className="h-8 !px-2.5 !py-0" disabled={busy || !text.trim()} onClick={() => send('message')}>
          {t('quarterlyPlan.agent.send')}
        </Button>
      </div>
    </div>
  );
}
