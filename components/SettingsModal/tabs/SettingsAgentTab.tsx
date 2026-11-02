'use client';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridge, useAgentBridgeRepos } from '@/features/swimlane/hooks/useAgentBridge';

import { AgentBridgeRepoItem, localFolderErrorText } from '../components/AgentBridgeRepoItem';
import { Toggle } from '../components/Toggle';

/**
 * Настройки агента: локальный мост к Claude CLI (на связи ли, запускать ли его сразу при отправке)
 * и репозитории агента — общий список: в каком делать задачу, мост решает по самой задаче (история
 * связанных задач, бриф), а не по проекту трекера. Список пополняется адресом из чата или «Добавить
 * папку» с готовым клоном; здесь же — забыть и указать папку с клоном для первого клона.
 */
export function SettingsAgentTab() {
  const { t } = useI18n();
  const bridge = useAgentBridge();
  const repos = useAgentBridgeRepos(bridge.alive);
  const list = repos.data?.repos ?? [];
  const [addError, setAddError] = useState('');

  const add = () => {
    setAddError('');
    repos.add().catch((reason: unknown) => setAddError(localFolderErrorText(t, reason)));
  };

  let bridgeStatus = t('settings.agentTab.bridgeOff');
  if (bridge.enabled && !bridge.checking) {
    bridgeStatus = bridge.alive ? t('agentSession.bridgeOnline') : t('agentSession.bridgeOffline');
  }

  let reposBody = <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.agentTab.reposOffline')}</p>;
  if (bridge.alive) {
    reposBody = (
      <>
        {list.length > 0 ? (
          <ul className="space-y-1.5">
            {list.map((repo) => (
              <AgentBridgeRepoItem
                key={repo.url}
                busy={repos.busy}
                repo={repo}
                onChooseLocal={repos.chooseLocal}
                onForget={() => repos.forget(repo.url)}
                onForgetLocal={repos.forgetLocal}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.agentTab.empty')}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={repos.busy} type="button" variant="secondary" onClick={add}>
            {t('settings.agentTab.add')}
          </Button>
          <span className="text-xs text-ds-text-muted">{t('settings.agentTab.addHint')}</span>
        </div>
        {addError ? <p className="text-xs text-red-600 dark:text-red-400">{addError}</p> : null}
      </>
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
