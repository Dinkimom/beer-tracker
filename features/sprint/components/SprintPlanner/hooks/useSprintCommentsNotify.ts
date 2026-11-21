import type { SprintCommentsNotify } from '@/features/sprint/model/sprintComments';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';

/**
 * Сообщения заметок с текущим переводом. Ссылка стабильна: заметки спринта не пересоздаются при
 * смене языка, а читают из неё актуальные тексты.
 */
export function useSprintCommentsNotify(): { readonly current: SprintCommentsNotify } {
  const { t } = useI18n();
  const notify = useRef<SprintCommentsNotify>({ conflict: () => undefined, failure: () => undefined });
  useEffect(() => {
    notify.current = {
      conflict: () => toast.error(t('sprint.taskToast.noteEditConflict')),
      failure: () => toast.error(t('sprintPlanner.swimlane.quickAddMenu.createCommentFailed')),
    };
  }, [t]);
  return notify;
}
