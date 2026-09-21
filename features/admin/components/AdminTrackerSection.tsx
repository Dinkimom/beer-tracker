'use client';

import type { FormEvent } from 'react';

import { Button } from '@/components/Button';
import { useIssueTrackerProviderKind, useIssueTrackerTokenHelpUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import {
  badgeSuccess,
  badgeWarning,
  cardBody,
  cardHeader,
  cardShell,
  field,
  label,
  muted,
} from '@/features/admin/adminUiTokens';
import { AdminTrackerSectionTokenFields } from '@/features/admin/components/AdminTrackerSectionTokenFields';
import {
  issueTrackerRequiresExternalOrgId,
  translateIssueTrackerProviderMessage,
} from '@/lib/issueTrackerProvider/issueTrackerUi';

function isTrackerVerifyDisabled(
  connectOrgId: string,
  trackerVerifyLoading: boolean,
  trackerOrgId: string,
  trackerHasStoredToken: boolean,
  trackerToken: string,
  requiresExternalOrgId: boolean
): boolean {
  if (!connectOrgId || trackerVerifyLoading) {
    return true;
  }
  if (requiresExternalOrgId && !trackerOrgId.trim()) {
    return true;
  }
  return !trackerHasStoredToken && !trackerToken.trim();
}

interface AdminTrackerSectionProps {
  'aria-labelledby'?: string;
  connectLoading: boolean;
  connectOrgId: string;
  id?: string;
  trackerHasStoredToken: boolean;
  trackerOrgId: string;
  trackerToken: string;
  trackerTokenEditOpen: boolean;
  trackerVerifyLoading: boolean;
  onSubmit: (e: FormEvent) => void;
  onTokenEditCancel: () => void;
  onTokenEditOpen: () => void;
  onTrackerOrgIdChange: (value: string) => void;
  onTrackerTokenChange: (value: string) => void;
  onVerify: () => void;
}

export function AdminTrackerSection({
  'aria-labelledby': ariaLabelledBy,
  connectLoading,
  connectOrgId,
  id,
  trackerHasStoredToken,
  trackerOrgId,
  trackerToken,
  trackerTokenEditOpen,
  trackerVerifyLoading,
  onSubmit,
  onTokenEditCancel,
  onTokenEditOpen,
  onTrackerOrgIdChange,
  onTrackerTokenChange,
  onVerify,
}: AdminTrackerSectionProps) {
  const { t } = useI18n();
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const tokenHelpUrl = useIssueTrackerTokenHelpUrl();
  const storedTokenOnly = trackerHasStoredToken && !trackerTokenEditOpen;
  const requiresExternalOrgId = issueTrackerRequiresExternalOrgId(issueTrackerProviderKind);

  return (
    <section aria-labelledby={ariaLabelledBy} className={cardShell} id={id}>
      <div className={`${cardHeader} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
        <div className="min-w-0">
          <p className={muted}>
            {translateIssueTrackerProviderMessage(
              t,
              issueTrackerProviderKind,
              'admin.trackerSection.description'
            )}
          </p>
        </div>
        <div className="flex shrink-0 justify-end sm:pt-0.5">
          {trackerHasStoredToken ? (
            <span className={badgeSuccess}>{t('admin.trackerSection.tokenSaved')}</span>
          ) : (
            <span className={badgeWarning}>{t('admin.trackerSection.notConfigured')}</span>
          )}
        </div>
      </div>
      <div className={`${cardBody} space-y-5`}>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
            {requiresExternalOrgId ? (
              <div className="w-full shrink-0 sm:w-[9rem] md:w-[10rem]">
                <label className={label} htmlFor="tr-org">
                  {translateIssueTrackerProviderMessage(
                    t,
                    issueTrackerProviderKind,
                    'admin.trackerSection.orgIdLabel'
                  )}
                </label>
                <input
                  className={field}
                  id="tr-org"
                  placeholder={translateIssueTrackerProviderMessage(
                    t,
                    issueTrackerProviderKind,
                    'admin.trackerSection.orgPlaceholder'
                  )}
                  required
                  type="text"
                  value={trackerOrgId}
                  onChange={(e) => onTrackerOrgIdChange(e.target.value)}
                />
              </div>
            ) : null}

            <AdminTrackerSectionTokenFields
              storedTokenOnly={storedTokenOnly}
              trackerHasStoredToken={trackerHasStoredToken}
              trackerToken={trackerToken}
              trackerTokenEditOpen={trackerTokenEditOpen}
              onTokenEditCancel={onTokenEditCancel}
              onTokenEditOpen={onTokenEditOpen}
              onTrackerTokenChange={onTrackerTokenChange}
            />

            <Button
              className="h-9 w-full shrink-0 px-3.5 sm:w-auto"
              disabled={isTrackerVerifyDisabled(
                connectOrgId,
                trackerVerifyLoading,
                trackerOrgId,
                trackerHasStoredToken,
                trackerToken,
                requiresExternalOrgId
              )}
              type="button"
              variant="outline"
              onClick={onVerify}
            >
              {trackerVerifyLoading
                ? t('admin.trackerSection.verifying')
                : t('admin.trackerSection.verifyToken')}
            </Button>
          </div>
          <p className={muted}>
            {t('auth.setup.getTokenPrefix')}{' '}
            <a
              className="font-semibold text-amber-600 hover:underline dark:text-amber-400"
              href={tokenHelpUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {translateIssueTrackerProviderMessage(
                t,
                issueTrackerProviderKind,
                'admin.trackerSection.oauthLink'
              )}
            </a>
          </p>

          <Button className="px-3.5 py-2" disabled={connectLoading} type="submit" variant="primary">
            {connectLoading ? t('admin.trackerSection.saving') : t('admin.trackerSection.saveSettings')}
          </Button>
        </form>
      </div>
    </section>
  );
}
