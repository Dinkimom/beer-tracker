'use client';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

interface ModalFormActionsProps {
  /** Идёт отправка: обе кнопки выключены, на главной — `busyLabel`. */
  busy?: boolean;
  busyLabel?: string;
  /** Отправить пока нельзя (форма не заполнена, данные не загружены). */
  disabled?: boolean;
  /** id формы в теле окна: главная кнопка отправляет её. Без него действие — `onSubmit`. */
  formId?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit?: () => void;
}

/** Кнопки формы для подвала `Modal` (`footer`): «Отмена» и главное действие, одинаковые во всех окнах. */
export function ModalFormActions({
  busy = false,
  busyLabel,
  disabled = false,
  formId,
  submitLabel,
  onCancel,
  onSubmit,
}: ModalFormActionsProps) {
  const { t } = useI18n();

  return (
    <>
      <Button disabled={busy} variant="outline" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
      <Button disabled={busy || disabled} form={formId} type={formId ? 'submit' : 'button'} onClick={onSubmit}>
        {busy && busyLabel ? busyLabel : submitLabel}
      </Button>
    </>
  );
}
