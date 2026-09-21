'use client';

import { Button } from '@/components/Button';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { field, label } from '@/features/admin/adminUiTokens';
import { translateIssueTrackerProviderMessage } from '@/lib/issueTrackerProvider/issueTrackerUi';

interface AdminTrackerSectionTokenFieldsProps {
  storedTokenOnly: boolean;
  trackerHasStoredToken: boolean;
  trackerToken: string;
  trackerTokenEditOpen: boolean;
  onTokenEditCancel: () => void;
  onTokenEditOpen: () => void;
  onTrackerTokenChange: (value: string) => void;
}

export function AdminTrackerSectionTokenFields({
  storedTokenOnly,
  trackerHasStoredToken,
  trackerToken,
  trackerTokenEditOpen,
  onTokenEditCancel,
  onTokenEditOpen,
  onTrackerTokenChange,
}: AdminTrackerSectionTokenFieldsProps) {
  const { t } = useI18n();
  const issueTrackerProviderKind = useIssueTrackerProviderKind();

  if (storedTokenOnly) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-0 sm:flex-none">
        <span className={label}>
          {translateIssueTrackerProviderMessage(
            t,
            issueTrackerProviderKind,
            'admin.trackerSection.oauthTokenLabel'
          )}
        </span>
        <Button
          className="h-9 w-full px-3.5 sm:w-auto sm:self-start"
          type="button"
          variant="accent"
          onClick={onTokenEditOpen}
        >
          {t('admin.trackerSection.changeToken')}
        </Button>
      </div>
    );
  }

  const tokenLabel = trackerTokenEditOpen
    ? translateIssueTrackerProviderMessage(
        t,
        issueTrackerProviderKind,
        'admin.trackerSection.oauthTokenNewLabel'
      )
    : translateIssueTrackerProviderMessage(
        t,
        issueTrackerProviderKind,
        'admin.trackerSection.oauthTokenLabel'
      );

  return (
    <div className="min-w-0 flex-1">
      <label className={label} htmlFor="tr-token">
        {tokenLabel}
      </label>
      {trackerTokenEditOpen ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
          <input
            autoComplete="off"
            className={`${field} min-w-0 w-full sm:flex-1`}
            id="tr-token"
            placeholder={t('admin.trackerSection.pasteTokenPlaceholder')}
            required
            type="password"
            value={trackerToken}
            onChange={(e) => onTrackerTokenChange(e.target.value)}
          />
          <Button
            className="h-9 w-full shrink-0 px-3.5 sm:w-auto"
            type="button"
            variant="outline"
            onClick={onTokenEditCancel}
          >
            {t('common.cancel')}
          </Button>
        </div>
      ) : (
        <input
          autoComplete="off"
          className={field}
          id="tr-token"
          placeholder={t('admin.trackerSection.pasteTokenPlaceholder')}
          required={!trackerHasStoredToken}
          type="password"
          value={trackerToken}
          onChange={(e) => onTrackerTokenChange(e.target.value)}
        />
      )}
    </div>
  );
}
