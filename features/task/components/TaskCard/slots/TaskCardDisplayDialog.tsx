'use client';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useI18n } from '@/contexts/LanguageContext';

import { TaskCardDisplayEditor } from './TaskCardDisplayEditor';

interface TaskCardDisplayDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Отображение карточки свимлейна отдельным окном — из «Слоёв» на доске. В настройках это экран, не окно. */
export function TaskCardDisplayDialog({ onClose, open }: TaskCardDisplayDialogProps) {
  const { t } = useI18n();

  return (
    <Modal
      className="max-w-6xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
      open={open}
      title={t('settings.planningTab.cardSlots.dialogTitle')}
      onClose={onClose}
    >
      <TaskCardDisplayEditor />
    </Modal>
  );
}
