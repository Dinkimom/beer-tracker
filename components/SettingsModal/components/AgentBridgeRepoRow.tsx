'use client';

import type { AgentBridgeRepoSettings } from '@/lib/agentSessions/agentBridgeDev';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

type RepoStatus = AgentBridgeRepoSettings['repos'][number]['status'];

const STATUS_CLASS: Record<RepoStatus, string> = {
  missing: 'text-red-600 dark:text-red-400',
  pending: 'text-amber-700 dark:text-amber-300',
  ready: 'text-green-700 dark:text-green-400',
};

const INPUT_CLASS =
  'min-w-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400';

/**
 * Строка «очередь → папка» в настройках агента. Путь — с подсказками из найденных мостом
 * репозиториев (`datalist`). Статус — у сохранённой пары: работает, ждёт «y» в терминале моста
 * или папки больше нет; у несохранённой правки статуса нет.
 */
export function AgentBridgeRepoRow({
  candidatesId,
  path,
  queue,
  status,
  onChange,
  onRemove,
}: {
  /** id `datalist` с найденными репозиториями. */
  candidatesId: string;
  path: string;
  queue: string;
  status: RepoStatus | null;
  onChange: (next: { path: string; queue: string }) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <li className="space-y-1" data-agent-bridge-repo={queue}>
      <div className="flex items-center gap-2">
        <input
          aria-label={t('settings.agentTab.queueLabel')}
          className={`${INPUT_CLASS} w-24 font-mono uppercase`}
          placeholder={t('settings.agentTab.queuePlaceholder')}
          value={queue}
          onChange={(event) => onChange({ path, queue: event.target.value.toUpperCase() })}
        />
        <input
          aria-label={t('settings.agentTab.pathLabel')}
          className={`${INPUT_CLASS} flex-1 font-mono`}
          list={candidatesId}
          placeholder={t('settings.agentTab.pathPlaceholder')}
          value={path}
          onChange={(event) => onChange({ path: event.target.value, queue })}
        />
        <HeaderIconButton aria-label={t('settings.agentTab.remove')} title={t('settings.agentTab.remove')} type="button" onClick={onRemove}>
          <Icon className="h-4 w-4" name="trash" />
        </HeaderIconButton>
      </div>
      {status ? (
        <p className={`pl-1 text-xs ${STATUS_CLASS[status]}`} data-agent-bridge-repo-status={status}>
          {t(`settings.agentTab.status.${status}`)}
        </p>
      ) : null}
    </li>
  );
}
