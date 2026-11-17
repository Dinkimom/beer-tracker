'use client';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useI18n } from '@/contexts/LanguageContext';

import { QuarterlyPlanTrackerEpicSearch } from './QuarterlyPlanTrackerEpicSearch';

interface QuarterlyPlanTrackerEpicDialogProps {
  boardId: number;
  /** Привязываем направление — ищем эпики; иначе эпик плана — ищем любые задачи. */
  direction: boolean;
  /** Ключи, которые уже стоят в плане: второй раз их не добавить. */
  usedIssueKeys: ReadonlySet<string>;
  onClose: () => void;
  onPick: (issueKey: string, title: string) => void;
}

/** Выбор в трекере: задачи — для эпика плана (новой строки или заведённой), эпика — для направления. */
export function QuarterlyPlanTrackerEpicDialog({
  boardId,
  direction,
  usedIssueKeys,
  onClose,
  onPick,
}: QuarterlyPlanTrackerEpicDialogProps) {
  const { t } = useI18n();

  return (
    <Modal
      className="max-w-xl"
      description={t(direction ? 'quarterlyPlan.link.directionHint' : 'quarterlyPlan.link.searchHint')}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      }
      title={t(direction ? 'quarterlyPlan.link.directionTitle' : 'quarterlyPlan.link.title')}
      onClose={onClose}
    >
      <QuarterlyPlanTrackerEpicSearch
        boardId={boardId}
        epicsOnly={direction}
        placeholder={t(direction ? 'quarterlyPlan.link.directionPlaceholder' : 'quarterlyPlan.link.searchPlaceholder')}
        usedIssueKeys={usedIssueKeys}
        onPick={onPick}
      />
    </Modal>
  );
}
