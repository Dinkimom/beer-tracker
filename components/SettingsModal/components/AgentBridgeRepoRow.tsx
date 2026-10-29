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
 * Строка репозитория в настройках агента: папка (с подсказками из найденных мостом репозиториев,
 * `datalist`), очереди задач, которые в ней делают, через запятую, и команды проверок по строке
 * (тесты, линтеры — агенту можно их запускать). Статус — у сохранённой строки:
 * работает, ждёт «y» в терминале моста или папки больше нет; у несохранённой правки статуса нет.
 */
export function AgentBridgeRepoRow({
  candidatesId,
  checks,
  path,
  queues,
  status,
  onChange,
  onRemove,
}: {
  /** id `datalist` с найденными репозиториями. */
  candidatesId: string;
  /** Команды проверок, по строке на команду. */
  checks: string;
  path: string;
  queues: string;
  status: RepoStatus | null;
  onChange: (next: { checks: string; path: string; queues: string }) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <li className="space-y-1" data-agent-bridge-repo={path}>
      <div className="flex items-center gap-2">
        <input
          aria-label={t('settings.agentTab.pathLabel')}
          className={`${INPUT_CLASS} flex-1 font-mono`}
          list={candidatesId}
          placeholder={t('settings.agentTab.pathPlaceholder')}
          value={path}
          onChange={(event) => onChange({ checks, path: event.target.value, queues })}
        />
        <input
          aria-label={t('settings.agentTab.queuesLabel')}
          className={`${INPUT_CLASS} w-36 font-mono uppercase`}
          placeholder={t('settings.agentTab.queuesPlaceholder')}
          title={t('settings.agentTab.queuesHint')}
          value={queues}
          onChange={(event) => onChange({ checks, path, queues: event.target.value.toUpperCase() })}
        />
        <HeaderIconButton aria-label={t('settings.agentTab.remove')} title={t('settings.agentTab.remove')} type="button" onClick={onRemove}>
          <Icon className="h-4 w-4" name="trash" />
        </HeaderIconButton>
      </div>
      <textarea
        aria-label={t('settings.agentTab.checksLabel')}
        className={`${INPUT_CLASS} block w-full resize-y font-mono text-xs`}
        placeholder={t('settings.agentTab.checksPlaceholder')}
        rows={2}
        title={t('settings.agentTab.checksHint')}
        value={checks}
        onChange={(event) => onChange({ checks: event.target.value, path, queues })}
      />
      {status ? (
        <p className={`pl-1 text-xs ${STATUS_CLASS[status]}`} data-agent-bridge-repo-status={status}>
          {t(`settings.agentTab.status.${status}`)}
        </p>
      ) : null}
    </li>
  );
}
