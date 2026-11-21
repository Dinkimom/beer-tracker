'use client';

import type { Task } from '@/types';

import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/contexts/LanguageContext';
import { TaskPassport } from '@/features/task/components/TaskPassport/TaskPassport';
import { getTaskByKey } from '@/lib/api/issues';

/** Содержимое подсказки: монтируется только при показе, тогда же грузит задачу вне спринта. */
export function HistoryTaskPassportContent({ issueKey, knownTask }: { issueKey: string; knownTask: Task | null }) {
  const { t } = useI18n();
  const { data, isPending } = useQuery({
    enabled: knownTask == null,
    queryFn: () => getTaskByKey(issueKey),
    queryKey: ['taskPassport', issueKey],
    staleTime: 5 * 60 * 1000,
  });
  const task = knownTask ?? data ?? null;
  if (task) return <TaskPassport task={task} />;
  return (
    <p className="w-72 px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
      {isPending ? t('taskPassport.loading') : t('taskPassport.notFound', { key: issueKey })}
    </p>
  );
}
