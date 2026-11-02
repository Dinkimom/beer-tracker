'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridge, useAgentBridgeRepos } from '@/features/swimlane/hooks/useAgentBridge';

import { AgentBridgeRepoItem } from '../components/AgentBridgeRepoItem';
import { Toggle } from '../components/Toggle';

/**
 * Настройки агента: локальный мост к Claude CLI (на связи ли, запускать ли его сразу при отправке)
 * и репозитории, которые мост запомнил за очередями задач. Настраивать их не нужно: адрес мост
 * спрашивает в чате при первой задаче очереди и клонирует сам; здесь — посмотреть, забыть и указать
 * папку с уже готовым клоном, чтобы первый клон не качал всё из сети.
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
            <AgentBridgeRepoItem
              key={`${queue} ${repo.url}`}
              busy={repos.busy}
              queue={queue}
              repo={repo}
              onChooseLocal={repos.chooseLocal}
              onForget={() => repos.forget({ queue, url: repo.url })}
              onForgetLocal={repos.forgetLocal}
            />
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
