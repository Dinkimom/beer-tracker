'use client';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridge, useAgentBridgeRepos } from '@/features/swimlane/hooks/useAgentBridge';

import { Toggle } from '../components/Toggle';

/**
 * Настройки агента: локальный мост к Claude CLI (на связи ли, запускать ли его сразу при отправке)
 * и репозитории, которые мост запомнил за очередями задач. Настраивать их не нужно: адрес мост
 * спрашивает в чате при первой задаче очереди и клонирует сам; здесь — посмотреть и забыть.
 */
export function SettingsAgentTab() {
  const { t } = useI18n();
  const bridge = useAgentBridge();
  const repos = useAgentBridgeRepos(bridge.alive);
  const queues = repos.data?.queues ?? [];

  let bridgeStatus = t('settings.agentTab.bridgeOff');
  if (bridge.enabled && !bridge.checking) {
    bridgeStatus = bridge.alive ? t('agentSession.bridgeOnline') : t('agentSession.bridgeOffline');
  }

  let reposBody = <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.agentTab.reposOffline')}</p>;
  if (bridge.alive && queues.length === 0) {
    reposBody = <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.agentTab.empty')}</p>;
  } else if (bridge.alive) {
    reposBody = (
      <ul className="space-y-1.5">
        {queues.flatMap(({ queue, repos: list }) =>
          list.map((repo) => (
            <li key={`${queue} ${repo.url}`} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
              <span className="w-14 shrink-0 font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">{queue}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-900 dark:text-gray-100">{repo.name}</span>
                <span className="block truncate font-mono text-[11px] text-gray-500 dark:text-gray-400" title={repo.url}>
                  {repo.url}
                  {repo.cloned ? null : ` · ${t('settings.agentTab.notCloned')}`}
                </span>
              </span>
              <Button
                className="!px-2.5 !py-1 text-xs"
                disabled={repos.forgetting}
                variant="ghost"
                onClick={() => repos.forget({ queue, url: repo.url })}
              >
                {t('settings.agentTab.forget')}
              </Button>
            </li>
          ))
        )}
      </ul>
    );
  }

  return (
    <div className="space-y-5" role="tabpanel">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ds-text-muted">
          {t('settings.agentTab.bridgeSection')}
        </h3>
        <p className="text-xs leading-snug text-ds-text-muted">{t('settings.agentTab.bridgeHint')}</p>
        <Toggle
          checked={bridge.enabled}
          hint={bridgeStatus}
          id="agent-bridge-enabled"
          label={t('agentSession.bridgeAuto')}
          onChange={bridge.setEnabled}
        />
      </section>

      <section className="space-y-3" data-agent-bridge-repos="">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ds-text-muted">
          {t('settings.agentTab.reposSection')}
        </h3>
        <p className="text-xs leading-snug text-ds-text-muted">{t('settings.agentTab.reposHint')}</p>
        {reposBody}
      </section>
    </div>
  );
}
