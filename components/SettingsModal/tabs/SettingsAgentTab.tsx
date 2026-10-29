'use client';

import { useId, useState } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridge, useAgentBridgeRepos } from '@/features/swimlane/hooks/useAgentBridge';

import { AgentBridgeRepoRow } from '../components/AgentBridgeRepoRow';
import { Toggle } from '../components/Toggle';

interface RepoDraft {
  /** Ключ строки: очередь меняют прямо в поле, по ней строку не узнать. */
  id: string;
  path: string;
  queue: string;
}

let draftSeq = 0;
function newDraftId(): string {
  draftSeq += 1;
  return `repo-${draftSeq}`;
}

const sameRepos = (a: readonly RepoDraft[], b: ReadonlyArray<Omit<RepoDraft, 'id'>>) =>
  a.length === b.length && a.every((repo, index) => repo.queue === b[index]?.queue && repo.path === b[index]?.path);

/**
 * Настройки агента: локальный мост к Claude CLI (на связи ли, запускать ли его сразу при отправке)
 * и репозитории для сессий разработки — задачи какой очереди в какой папке. Список хранит мост
 * у себя (`~/.beer-tracker/agent-bridge.json`), новая пара работает после «y» в его терминале.
 */
export function SettingsAgentTab() {
  const { t } = useI18n();
  const bridge = useAgentBridge();
  const repos = useAgentBridgeRepos(bridge.alive);
  const candidatesId = useId();
  const saved = repos.data?.repos ?? [];
  const [draft, setDraft] = useState<RepoDraft[] | null>(null);
  const [error, setError] = useState('');
  const rows = draft ?? saved.map(({ path, queue }) => ({ id: `${queue}=${path}`, path, queue }));
  const dirty = draft != null && !sameRepos(draft, saved);

  const update = (next: RepoDraft[]) => {
    setDraft(next);
    setError('');
  };

  const save = () => {
    const filled = rows
      .filter((repo) => repo.queue.trim() || repo.path.trim())
      .map(({ path, queue }) => ({ path, queue }));
    repos
      .save(filled)
      .then(() => setDraft(null))
      .catch((reason: unknown) => setError(saveErrorText(reason)));
  };

  /** Ответ моста `код: значение` → текст для человека; незнакомое — как есть. */
  const saveErrorText = (reason: unknown): string => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const colon = message.indexOf(':');
    const code = colon < 0 ? message : message.slice(0, colon);
    const value = colon < 0 ? '' : message.slice(colon + 1).trim();
    if (code === 'not_a_git_repo') {
      return t('settings.agentTab.errors.notAGitRepo', { path: value });
    }
    if (code === 'invalid_queue') {
      return t('settings.agentTab.errors.invalidQueue', { queue: value });
    }
    return t('settings.agentTab.saveFailed', { error: message });
  };

  let bridgeStatus = t('settings.agentTab.bridgeOff');
  if (bridge.enabled && !bridge.checking) {
    bridgeStatus = bridge.alive ? t('agentSession.bridgeOnline') : t('agentSession.bridgeOffline');
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
        {bridge.alive ? (
          <>
            {rows.length > 0 ? (
              <ul className="space-y-2">
                {rows.map((repo, index) => (
                  <AgentBridgeRepoRow
                    key={repo.id}
                    candidatesId={candidatesId}
                    path={repo.path}
                    queue={repo.queue}
                    status={dirty ? null : (saved[index]?.status ?? null)}
                    onChange={(next) => update(rows.map((item, at) => (at === index ? { ...item, ...next } : item)))}
                    onRemove={() => update(rows.filter((_, at) => at !== index))}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.agentTab.empty')}</p>
            )}
            <datalist id={candidatesId}>
              {(repos.data?.candidates ?? []).map((path) => (
                <option key={path} value={path} />
              ))}
            </datalist>
            {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => update([...rows, { id: newDraftId(), path: '', queue: '' }])}>
                {t('settings.agentTab.add')}
              </Button>
              <Button disabled={!dirty || repos.saving} type="button" onClick={save}>
                {t('settings.agentTab.save')}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.agentTab.reposOffline')}</p>
        )}
      </section>
    </div>
  );
}
