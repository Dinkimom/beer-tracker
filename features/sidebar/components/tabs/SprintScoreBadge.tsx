'use client';

import { useI18n } from '@/contexts/LanguageContext';
import {
  clampSprintScoreMark,
  SprintScoreMarkInline,
} from '@/features/sprint/components/SprintScoreMarkInline';

export function SprintScoreBadge({ mark }: { mark: number }) {
  const { t } = useI18n();
  const filled = clampSprintScoreMark(mark);
  const label = t('sidebar.sprintScoreBlock.scoreMarkAria', { mark: String(filled) });

  return <SprintScoreMarkInline ariaLabel={label} mark={filled} size="lg" />;
}
