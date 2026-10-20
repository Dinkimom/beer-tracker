'use client';

import toast from 'react-hot-toast';

import { CopyFeedbackGlyph } from '@/components/CopyFeedbackGlyph';
import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridge } from '@/features/swimlane/hooks/useAgentBridge';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { claudeNewChatUrl, cursorPromptUrl } from '@/lib/agentSessions/agentChatLinks';

const LINK_CLASS =
  'inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-amber-900 transition-colors hover:bg-amber-500/[0.15] active:bg-amber-500/[0.22] disabled:pointer-events-none disabled:opacity-60 dark:text-amber-200';

const BAR_CLASS =
  'flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200';

/**
 * Сессия ждёт агента, а он внешний: увидит её, когда человек ему напишет.
 * Полоска над полем ввода — фраза для чата и ссылки, открывающие чат с ней (фраза ещё и в буфере).
 * Если мост к Claude CLI на связи, агента он запускает сам при отправке; пока тот работает, полоски
 * нет — ход работы в пузыре «Ждёт агента». Кнопка — на случай, когда запуск не прошёл.
 */
export function AgentCallAgentBar({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const { copied, copy } = useCopyFeedback();
  const bridge = useAgentBridge();
  const prompt = t('agentSession.agentPrompt');
  const linkHint = t('agentSession.linkHint');

  if (bridge.alive) {
    const start = () => {
      bridge
        .run(sessionId)
        .then((accepted) => {
          if (!accepted) {
            toast.error(t('agentSession.bridgeRunFailed'));
          }
        })
        .catch(() => undefined);
    };
    return (
      <div className={BAR_CLASS} data-agent-call-bar="">
        <span className="mr-auto min-w-0">{t('agentSession.bridgeReady')}</span>
        <button className={LINK_CLASS} type="button" onClick={start}>
          {t('agentSession.bridgeRun')}
        </button>
      </div>
    );
  }

  const open = (url: string | null, inNewTab: boolean) => {
    // Буфер — до перехода: после него вкладка теряет фокус и запись в буфер может не пройти.
    copy(prompt).catch(() => undefined);
    if (!url) {
      return;
    }
    if (inNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className={BAR_CLASS} data-agent-call-bar="">
      <span className="mr-auto min-w-0">{t('agentSession.callAgentHint')}</span>
      <button className={LINK_CLASS} title={prompt} type="button" onClick={() => copy(prompt).catch(() => undefined)}>
        <CopyFeedbackGlyph className="h-3 w-3" copied={copied} idleName="copy" />
        {copied ? t('agentSession.copied') : t('agentSession.copyPhrase')}
      </button>
      <button className={LINK_CLASS} title={linkHint} type="button" onClick={() => open(claudeNewChatUrl(prompt), true)}>
        {t('agentSession.claude')}
      </button>
      <button className={LINK_CLASS} title={linkHint} type="button" onClick={() => open(cursorPromptUrl(prompt), false)}>
        {t('agentSession.cursor')}
      </button>
    </div>
  );
}
