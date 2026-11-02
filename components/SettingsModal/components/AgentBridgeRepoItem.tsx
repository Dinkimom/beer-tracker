'use client';

import type { AgentBridgeRepoSettings } from '@/lib/agentSessions/agentBridgeDev';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

type Repo = AgentBridgeRepoSettings['repos'][number];

const SMALL_BUTTON = '!px-2.5 !py-1 text-xs';

/** Домашняя папка в пути — как `~`: путь короче, а мост и браузер на одной машине. */
const shortPath = (path: string) => path.replace(/^\/(?:Users|home)\/[^/]+/, '~');

/** Ошибка моста `код: подробность` про папку → текст для человека. */
export function localFolderErrorText(t: (key: string, params?: Record<string, string>) => string, reason: unknown): string {
  const message = reason instanceof Error ? reason.message : String(reason);
  const [code = '', detail = ''] = message.split(/:\s*/, 2);
  const known: Record<string, string> = {
    no_origin: t('settings.agentTab.localErrors.noOrigin', { path: shortPath(detail) }),
    not_a_git_repo: t('settings.agentTab.localErrors.notAGitRepo', { path: shortPath(detail) }),
    other_repo: t('settings.agentTab.localErrors.otherRepo', { repo: detail }),
    picker_unavailable: t('settings.agentTab.localErrors.pickerUnavailable'),
  };
  return known[code] ?? t('settings.agentTab.localErrors.failed', { error: message });
}

/**
 * Репозиторий агента в Настройках → Агент: адрес, склонирован ли мост его к себе, «Забыть». Пока не
 * склонирован — откуда взять историю для первого клона: папку с клоном мост находит сам по `origin`
 * или её выбирают кнопкой (системный диалог открывает мост). Без неё большой репозиторий клонируется
 * из сети десятки минут.
 */
export function AgentBridgeRepoItem({
  busy,
  repo,
  onChooseLocal,
  onForget,
  onForgetLocal,
}: {
  busy: boolean;
  repo: Repo;
  onChooseLocal: (url: string) => Promise<unknown>;
  onForget: () => void;
  onForgetLocal: (url: string) => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState('');

  const choose = () => {
    setError('');
    onChooseLocal(repo.url).catch((reason: unknown) => setError(localFolderErrorText(t, reason)));
  };

  return (
    <li className="space-y-1.5 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700" data-agent-bridge-repo={repo.url}>
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-gray-900 dark:text-gray-100">{repo.name}</span>
          <span className="block truncate font-mono text-[11px] text-gray-500 dark:text-gray-400" title={repo.url}>
            {repo.url}
            {repo.cloned ? null : ` · ${t('settings.agentTab.notCloned')}`}
          </span>
        </span>
        <Button className={SMALL_BUTTON} disabled={busy} variant="ghost" onClick={onForget}>
          {t('settings.agentTab.forget')}
        </Button>
      </div>
      {repo.cloned ? null : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
          <span className="min-w-0 flex-1 truncate" title={repo.local?.path ?? t('settings.agentTab.localHint')}>
            {repo.local
              ? t('settings.agentTab.localCopy', {
                  path: shortPath(repo.local.path),
                  source: repo.local.source === 'found' ? t('settings.agentTab.localFound') : t('settings.agentTab.localChosen'),
                })
              : t('settings.agentTab.localNone')}
          </span>
          <Button className={SMALL_BUTTON} disabled={busy} variant="outline" onClick={choose}>
            {t('settings.agentTab.localChoose')}
          </Button>
          {repo.local?.source === 'chosen' ? (
            <Button className={SMALL_BUTTON} disabled={busy} variant="ghost" onClick={() => onForgetLocal(repo.url)}>
              {t('settings.agentTab.localForget')}
            </Button>
          ) : null}
        </div>
      )}
      {error ? <p className="pl-[4.25rem] text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </li>
  );
}
