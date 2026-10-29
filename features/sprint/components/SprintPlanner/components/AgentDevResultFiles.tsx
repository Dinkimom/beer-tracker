'use client';

import type { AgentBridgeReview } from '@/lib/agentSessions/agentBridgeDev';

import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { AgentDevFileDiff } from './AgentDevFileDiff';

/** Сколько файлов видно сразу; остальные — по «Ещё N». */
const VISIBLE_FILES = 6;

const ROW_CLASS =
  'flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-gray-500/[0.12] dark:hover:bg-white/[0.08]';

/**
 * Изменённые файлы ветки против основной: папка приглушённо, имя файла ярко, +/− по файлу.
 * Клик раскрывает дифф файла прямо здесь; значок справа открывает файл в VS Code.
 */
export function AgentDevResultFiles({
  files,
  sessionId,
  worktree,
}: {
  files: AgentBridgeReview['files'];
  sessionId: string;
  worktree: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  /** Раскрытые файлы: каждый открывается и закрывается сам по себе. */
  const [openPaths, setOpenPaths] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (path: string) =>
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (!next.delete(path)) {
        next.add(path);
      }
      return next;
    });
  const shown = expanded ? files : files.slice(0, VISIBLE_FILES);
  const hidden = files.length - shown.length;

  return (
    <ul className="space-y-0.5" data-agent-dev-files="">
      {shown.map((file) => {
        const slash = file.path.lastIndexOf('/');
        return (
          <li key={file.path} className="space-y-1">
            <div className="flex items-center gap-1">
              <button
                aria-expanded={openPaths.has(file.path)}
                className={ROW_CLASS}
                type="button"
                onClick={() => toggle(file.path)}
              >
                <Icon
                  className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${openPaths.has(file.path) ? 'rotate-90' : ''}`}
                  name="chevron-right"
                />
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
              </button>
              <a
                aria-label={t('agentSession.resultOpenFile', { path: file.path })}
                className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-500/[0.12] hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100"
                href={`vscode://file${encodeURI(`${worktree}/${file.path}`)}`}
                title={t('agentSession.resultOpenFile', { path: file.path })}
              >
                <Icon className="h-3 w-3" name="code" />
              </a>
            </div>
            {openPaths.has(file.path) ? <AgentDevFileDiff path={file.path} sessionId={sessionId} /> : null}
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
