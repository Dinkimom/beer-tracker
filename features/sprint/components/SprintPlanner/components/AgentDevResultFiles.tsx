'use client';

import type { AgentBridgeReview } from '@/lib/agentSessions/agentBridgeDev';

import { useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

/** Сколько файлов видно сразу; остальные — по «Ещё N». */
const VISIBLE_FILES = 6;

const ROW_CLASS =
  'flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-gray-500/[0.12] dark:hover:bg-white/[0.08]';

/**
 * Изменённые файлы ветки против основной: папка приглушённо, имя файла ярко, +/− по файлу.
 * Клик открывает файл в VS Code в рабочей копии задачи.
 */
export function AgentDevResultFiles({ files, worktree }: { files: AgentBridgeReview['files']; worktree: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? files : files.slice(0, VISIBLE_FILES);
  const hidden = files.length - shown.length;

  return (
    <ul className="space-y-0.5" data-agent-dev-files="">
      {shown.map((file) => {
        const slash = file.path.lastIndexOf('/');
        return (
          <li key={file.path}>
            <a
              className={ROW_CLASS}
              href={`vscode://file${encodeURI(`${worktree}/${file.path}`)}`}
              title={t('agentSession.resultOpenFile', { path: file.path })}
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[11px]" dir="rtl">
                {/* rtl: длинный путь обрезается слева — имя файла видно всегда. */}
                <bdi>
                  <span className="text-gray-500 dark:text-gray-400">{file.path.slice(0, slash + 1)}</span>
                  <span className="text-gray-900 dark:text-gray-100">{file.path.slice(slash + 1)}</span>
                </bdi>
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums">
                <span className="text-green-700 dark:text-green-400">+{file.insertions}</span>{' '}
                <span className="text-red-600 dark:text-red-400">−{file.deletions}</span>
              </span>
            </a>
          </li>
        );
      })}
      {files.length > VISIBLE_FILES ? (
        <li>
          <button
            className="cursor-pointer rounded-md px-1 text-[11px] text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {hidden > 0 ? t('agentSession.resultFilesMore', { count: hidden }) : t('agentSession.resultFilesLess')}
          </button>
        </li>
      ) : null}
    </ul>
  );
}
