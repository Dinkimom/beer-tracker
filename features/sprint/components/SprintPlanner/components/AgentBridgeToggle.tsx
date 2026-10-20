'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridge } from '@/features/swimlane/hooks/useAgentBridge';

/**
 * Галка под полем ввода: отправка сразу запускает агента в Claude CLI через локальный мост.
 * Рядом — на связи ли мост, чтобы не узнавать об этом после отправки.
 */
export function AgentBridgeToggle() {
  const { t } = useI18n();
  const bridge = useAgentBridge();
  let status: string | null = null;
  if (bridge.enabled && !bridge.checking) {
    status = bridge.alive ? t('agentSession.bridgeOnline') : t('agentSession.bridgeOffline');
  }

  return (
    <label
      className="flex cursor-pointer items-center gap-1.5 px-1 text-[11px] text-gray-500 dark:text-gray-400"
      data-agent-bridge-toggle=""
      title={t('agentSession.bridgeAutoHint')}
    >
      <input
        checked={bridge.enabled}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-gray-300 accent-blue-500 dark:border-gray-500 dark:accent-blue-400"
        type="checkbox"
        onChange={(event) => bridge.setEnabled(event.target.checked)}
      />
      <span className="shrink-0">{t('agentSession.bridgeAuto')}</span>
      {status ? (
        <span className="flex min-w-0 items-center gap-1 truncate">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${bridge.alive ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'}`}
          />
          {status}
        </span>
      ) : null}
    </label>
  );
}
