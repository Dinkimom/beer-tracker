'use client';

import type { AdminTrackerConnectionBody } from '@/lib/api/admin/tracker';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { IssueTrackerProviderOverride } from '@/contexts/IssueTrackerProviderOverride';
import { useI18n } from '@/contexts/LanguageContext';
import { useAdminOrganizationId } from '@/features/admin/AdminOrganizationIdContext';
import { muted, pageStack, tabBtnActive, tabBtnBase, tabBtnIdle, tabList } from '@/features/admin/adminUiTokens';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminTrackerIntegrationSection } from '@/features/admin/components/AdminTrackerIntegrationSection';
import { AdminTrackerSection } from '@/features/admin/components/AdminTrackerSection';
import { notifyAdminTrackerConnectionChanged } from '@/features/admin/hooks/useAdminTrackerConnectionReady';
import { productSessionQueryKey } from '@/hooks/useProductTenantOrganizations';
import {
  connectAdminTracker,
  fetchAdminTrackerForm,
  verifyAdminTrackerToken,
} from '@/lib/api/admin/tracker';
import { readApiErrorMessage } from '@/lib/api/readApiError';
import {
  resolveIssueTrackerExternalOrgIdForConnect,
  translateIssueTrackerProviderMessage,
} from '@/lib/issueTrackerProvider/issueTrackerUi';

import {
  buildTrackerConnectSuccessMessage,
  showTrackerConnectValidationError,
  validateTrackerConnectForm,
} from './trackerPageConnectHelpers';

type TrackerAdminTabId = 'connection' | 'integration';

function tabFromSearchParams(tabParam: string | null): TrackerAdminTabId {
  return tabParam === 'integration' ? 'integration' : 'connection';
}

export default function TrackerPage() {
  const { t } = useI18n();
  const sessionProviderKind = useIssueTrackerProviderKind();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const connectOrgId = useAdminOrganizationId();
  const activeTab = tabFromSearchParams(searchParams.get('tab'));

  const setActiveTab = useCallback(
    (tab: TrackerAdminTabId) => {
      const p = new URLSearchParams(searchParams.toString());
      if (tab === 'integration') {
        p.set('tab', 'integration');
      } else {
        p.delete('tab');
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const [trackerProvider, setTrackerProvider] = useState<IssueTrackerProviderKind | null>(null);
  const [trackerApiUrl, setTrackerApiUrl] = useState('');
  const [trackerProviderLocked, setTrackerProviderLocked] = useState(false);
  const [savedTracker, setSavedTracker] = useState<{
    apiUrl: string;
    kind: IssueTrackerProviderKind;
  } | null>(null);
  const [trackerOrgId, setTrackerOrgId] = useState('');
  const [trackerEmail, setTrackerEmail] = useState('');
  const [savedJiraEmail, setSavedJiraEmail] = useState('');
  const [trackerToken, setTrackerToken] = useState('');
  const [trackerHasStoredToken, setTrackerHasStoredToken] = useState(false);
  const [trackerTokenEditOpen, setTrackerTokenEditOpen] = useState(false);
  const [trackerVerifyLoading, setTrackerVerifyLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [trackerFormHydrated, setTrackerFormHydrated] = useState(false);

  const loadTrackerForm = useCallback(async () => {
    if (!connectOrgId) {
      setTrackerFormHydrated(false);
      return;
    }
    setTrackerFormHydrated(false);
    try {
      const data = await fetchAdminTrackerForm(connectOrgId);
      setTrackerProvider(data.provider ?? null);
      setSavedTracker(data.provider ? { apiUrl: data.apiUrl ?? '', kind: data.provider } : null);
      setTrackerProviderLocked(data.providerLocked === true);
      setTrackerApiUrl(data.apiUrl ?? '');
      setTrackerOrgId(data.trackerOrgId ?? '');
      setTrackerEmail(data.jiraEmail ?? '');
      setSavedJiraEmail(data.jiraEmail ?? '');
      setTrackerHasStoredToken(data.hasStoredToken === true);
    } catch {
      /* ignore */
    } finally {
      setTrackerFormHydrated(true);
    }
  }, [connectOrgId]);

  useEffect(() => {
    void loadTrackerForm();
  }, [loadTrackerForm]);

  const issueTrackerProviderKind = trackerProvider ?? sessionProviderKind;
  const trackerExternalOrgId = resolveIssueTrackerExternalOrgIdForConnect(
    issueTrackerProviderKind,
    trackerOrgId
  );
  // OAuth с регистрации не считается API-токеном Jira Cloud, пока не сохранён email аккаунта.
  const orgApiTokenReady =
    trackerHasStoredToken &&
    (issueTrackerProviderKind !== 'jira-cloud' || savedJiraEmail.trim() !== '');
  const trackerIntegrationUnlocked =
    trackerFormHydrated &&
    savedTracker !== null &&
    orgApiTokenReady &&
    trackerExternalOrgId !== '';

  function trackerConnectionBody(): AdminTrackerConnectionBody {
    const body: AdminTrackerConnectionBody = { provider: issueTrackerProviderKind };
    if (trackerApiUrl.trim()) body.trackerApiBaseUrl = trackerApiUrl.trim();
    if (trackerExternalOrgId) body.trackerOrgId = trackerExternalOrgId;
    if (trackerToken.trim()) body.oauthToken = trackerToken.trim();
    if (trackerEmail.trim()) body.jiraEmail = trackerEmail.trim();
    return body;
  }

  const tabSearchParam = searchParams.get('tab');

  useEffect(() => {
    if (!connectOrgId) {
      if (tabSearchParam === 'integration') {
        setActiveTab('connection');
      }
      return;
    }
    if (trackerFormHydrated && activeTab === 'integration' && !trackerIntegrationUnlocked) {
      setActiveTab('connection');
    }
  }, [
    activeTab,
    connectOrgId,
    setActiveTab,
    tabSearchParam,
    trackerFormHydrated,
    trackerIntegrationUnlocked,
  ]);

  async function verifyTrackerToken() {
    if (!connectOrgId) return;
    setTrackerVerifyLoading(true);
    try {
      const data = await verifyAdminTrackerToken(connectOrgId, trackerConnectionBody());
      toast.success(
        data.message ??
          translateIssueTrackerProviderMessage(
            t,
            issueTrackerProviderKind,
            'admin.tracker.tokenVerifiedMessage'
          )
      );
    } catch (error) {
      toast.error(readApiErrorMessage(error, t('admin.tracker.verifyFailed')));
    } finally {
      setTrackerVerifyLoading(false);
    }
  }

  async function connectTracker(e: React.FormEvent) {
    e.preventDefault();
    const needNewTokenEntry = !trackerHasStoredToken || trackerTokenEditOpen;
    const validationError = validateTrackerConnectForm({
      connectOrgId,
      issueTrackerProviderKind,
      needNewTokenEntry,
      t,
      trackerEmail,
      trackerToken,
      trackerTokenEditOpen,
    });
    if (validationError) {
      showTrackerConnectValidationError(validationError);
      return;
    }
    setConnectLoading(true);
    try {
      const data = await connectAdminTracker(connectOrgId, {
        ...trackerConnectionBody(),
        trackerOrgId: trackerExternalOrgId,
      });
      toast.success(buildTrackerConnectSuccessMessage({ data, t, trackerToken }));
      if (trackerToken.trim()) setTrackerToken('');
      setTrackerTokenEditOpen(false);
      void loadTrackerForm();
      await queryClient.invalidateQueries({ queryKey: productSessionQueryKey });
      notifyAdminTrackerConnectionChanged(connectOrgId);
      router.refresh();
    } catch (error) {
      toast.error(readApiErrorMessage(error, t('admin.tracker.connectFailed')));
    } finally {
      setConnectLoading(false);
    }
  }

  return (
    <div className={pageStack}>
      <AdminPageHeader
        title={translateIssueTrackerProviderMessage(
          t,
          issueTrackerProviderKind,
          'admin.trackerSection.title'
        )}
      />
      {connectOrgId ? (
        <div
          aria-label={translateIssueTrackerProviderMessage(
            t,
            issueTrackerProviderKind,
            'admin.tracker.tablistAria'
          )}
          className={tabList}
          role="tablist"
        >
          <Button
            aria-controls="tracker-panel-connection"
            aria-selected={activeTab === 'connection'}
            className={`${tabBtnBase} !flex !min-h-0 !justify-center ${
              activeTab === 'connection' ? tabBtnActive : tabBtnIdle
            }`}
            id="tracker-tab-connection"
            role="tab"
            type="button"
            variant="ghost"
            onClick={() => setActiveTab('connection')}
          >
            {t('admin.tracker.tabConnection')}
          </Button>
          <Button
            aria-controls="tracker-panel-integration"
            aria-selected={activeTab === 'integration'}
            className={`${tabBtnBase} !flex !min-h-0 !justify-center !gap-2 ${
              activeTab === 'integration' ? tabBtnActive : tabBtnIdle
            }`}
            disabled={!trackerIntegrationUnlocked}
            id="tracker-tab-integration"
            role="tab"
            title={
              trackerIntegrationUnlocked
                ? t('admin.tracker.integrationTabTitleUnlocked')
                : translateIssueTrackerProviderMessage(
                    t,
                    issueTrackerProviderKind,
                    'admin.tracker.integrationLockedHint'
                  )
            }
            type="button"
            variant="ghost"
            onClick={() => {
              if (trackerIntegrationUnlocked) setActiveTab('integration');
            }}
          >
            {t('admin.tracker.tabIntegration')}
            {!trackerIntegrationUnlocked ? (
              <Icon className="h-4 w-4 shrink-0" name="lock" />
            ) : null}
          </Button>
        </div>
      ) : (
        <p className={`text-sm ${muted}`}>{t('admin.common.pickOrgForTracker')}</p>
      )}

      <div
        aria-labelledby="tracker-tab-connection"
        hidden={Boolean(connectOrgId) && activeTab !== 'connection'}
        id="tracker-panel-connection"
        role="tabpanel"
      >
        <IssueTrackerProviderOverride apiUrl={trackerApiUrl} kind={issueTrackerProviderKind}>
          <AdminTrackerSection
            aria-labelledby="tracker-tab-connection"
            connectLoading={connectLoading}
            connectOrgId={connectOrgId}
            jiraCloudSavedApiUrl={savedTracker?.kind === 'jira-cloud' ? savedTracker.apiUrl : ''}
            trackerApiUrl={trackerApiUrl}
            trackerEmail={trackerEmail}
            trackerHasStoredToken={orgApiTokenReady}
            trackerOrgId={trackerOrgId}
            trackerProviderLocked={trackerProviderLocked}
            trackerToken={trackerToken}
            trackerTokenEditOpen={trackerTokenEditOpen}
            trackerVerifyLoading={trackerVerifyLoading}
            onSubmit={(e) => void connectTracker(e)}
            onTokenEditCancel={() => {
              setTrackerTokenEditOpen(false);
              setTrackerToken('');
            }}
            onTokenEditOpen={() => {
              setTrackerTokenEditOpen(true);
              setTrackerToken('');
            }}
            onTrackerApiUrlChange={setTrackerApiUrl}
            onTrackerEmailChange={setTrackerEmail}
            onTrackerOrgIdChange={setTrackerOrgId}
            onTrackerProviderChange={(kind) => {
              setTrackerProvider(kind);
              setTrackerApiUrl(kind === savedTracker?.kind ? savedTracker.apiUrl : '');
            }}
            onTrackerTokenChange={setTrackerToken}
            onVerify={() => void verifyTrackerToken()}
          />
        </IssueTrackerProviderOverride>
      </div>

      {connectOrgId && trackerIntegrationUnlocked && activeTab === 'integration' ? (
        <div
          aria-labelledby="tracker-tab-integration"
          id="tracker-panel-integration"
          role="tabpanel"
        >
          <AdminTrackerIntegrationSection organizationId={connectOrgId} />
        </div>
      ) : null}
    </div>
  );
}
