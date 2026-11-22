'use client';

import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { translateSprintStatus } from '@/utils/translations';

/**
 * Цвет пилюли спринта — палитра статусов задач. Черновик и архив нейтральные (серые): это не тревога,
 * а состояние; оранжевый «готово к тесту» у черновика в тёмной теме читался как ошибка.
 */
function mapSprintStatusToTaskStatus(sprintStatus: string): string {
  const statusMap: Record<string, string> = {
    closed: 'closed',
    draft: 'open',
    in_progress: 'inprogress',
  };
  return statusMap[sprintStatus] || sprintStatus;
}

interface SprintStatusTagProps {
  archived: boolean;
  status: string;
}

/** Тот же тег статуса, что в селекторе спринтов. */
export function SprintStatusTag({ archived, status }: SprintStatusTagProps) {
  const { language, t } = useI18n();

  if (archived) {
    return <StatusTag label={t('sprint.status.archived')} status="open" />;
  }

  if (!status) return null;

  return (
    <StatusTag
      label={translateSprintStatus(status, language)}
      status={mapSprintStatusToTaskStatus(status)}
    />
  );
}
