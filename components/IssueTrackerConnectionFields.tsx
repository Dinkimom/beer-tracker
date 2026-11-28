'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import { CustomSelect } from '@/components/CustomSelect';
import { Input } from '@/components/Input';
import { useI18n } from '@/contexts/LanguageContext';
import { useBuiltInTrackerEnabled } from '@/hooks/useBuiltInTrackerEnabled';
import { ISSUE_TRACKER_PROVIDER_KINDS } from '@/lib/issueTrackerProvider/types';

interface IssueTrackerConnectionFieldsProps {
  apiUrl: string;
  /** URL API приходит из другого источника (Jira Cloud OAuth на регистрации). */
  apiUrlHidden?: boolean;
  disabled?: boolean;
  idPrefix: string;
  kind: IssueTrackerProviderKind;
  /** Трекер уже синхронизирован — тип менять нельзя. */
  kindLocked?: boolean;
  onApiUrlChange: (value: string) => void;
  onKindChange: (value: IssueTrackerProviderKind) => void;
}

/** Выбор трекера задач и URL его API (регистрация, админка). У Яндекс Трекера API один — без поля URL. */
export function IssueTrackerConnectionFields({
  apiUrl,
  apiUrlHidden = false,
  disabled = false,
  idPrefix,
  kind,
  kindLocked = false,
  onApiUrlChange,
  onKindChange,
}: IssueTrackerConnectionFieldsProps) {
  const { t } = useI18n();
  const builtInTrackerEnabled = useBuiltInTrackerEnabled();
  // Встроенный трекер — только если включён на сервере; уже выбранный остаётся в списке (админка).
  const options: CustomSelectOption<IssueTrackerProviderKind>[] = ISSUE_TRACKER_PROVIDER_KINDS.filter(
    (value) => value !== 'otorva' || builtInTrackerEnabled || kind === 'otorva'
  ).map((value) => ({ label: t(`common.issueTracker.providerOption.${value}`), value }));
  const apiUrlId = `${idPrefix}-tracker-api-url`;
  // Яндекс — публичный API, встроенный трекер — адрес на этом сервере: поле не нужно.
  const showApiUrl = !apiUrlHidden && kind !== 'tracker' && kind !== 'otorva';

  return (
    <div className="space-y-4">
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('common.issueTracker.providerLabel')}
        </span>
        <CustomSelect
          className="mt-1 w-full"
          disabled={disabled || kindLocked}
          options={options}
          selectedPrefix=""
          title={t('common.issueTracker.providerLabel')}
          value={kind}
          onChange={onKindChange}
        />
        {kindLocked ? (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('common.issueTracker.providerLocked')}
          </p>
        ) : null}
      </div>
      {showApiUrl ? (
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor={apiUrlId}
          >
            {t('common.issueTracker.apiUrlLabel')}
          </label>
          <Input
            autoComplete="off"
            className="mt-1"
            disabled={disabled}
            id={apiUrlId}
            inputMode="url"
            placeholder={t(`common.issueTracker.apiUrlPlaceholder.${kind}`)}
            required
            type="url"
            value={apiUrl}
            onChange={(e) => onApiUrlChange(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t(`common.issueTracker.apiUrlHint.${kind}`)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
