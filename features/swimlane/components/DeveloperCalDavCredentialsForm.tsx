'use client';

import type { DeveloperCalDavCredentials } from '@/lib/calendar/developerCalDavCredentialsTypes';

import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useI18n } from '@/contexts/LanguageContext';
import { useDeveloperCalDavCredentialsStorage } from '@/hooks/useLocalStorage';
import { fetchCalDavCalendarEventsFromApi } from '@/lib/api/calendar';
import { inferMailRuEmailFromCalDavUrl } from '@/lib/calendar/developerCalDavCredentialsParseHelpers';

interface DeveloperCalDavCredentialsFormProps {
  developerId: string;
}

export function DeveloperCalDavCredentialsForm({
  developerId,
}: DeveloperCalDavCredentialsFormProps) {
  const { t } = useI18n();
  const [stored, setStored] = useDeveloperCalDavCredentialsStorage(developerId);
  const [caldavUrl, setCaldavUrl] = useState('');
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    setCaldavUrl(stored?.caldavUrl ?? '');
    setEmail(stored?.email ?? '');
    setAppPassword(stored?.appPassword ?? '');
    setError(null);
    setTestOk(false);
    setSavedOk(false);
  }, [developerId, stored?.appPassword, stored?.caldavUrl, stored?.email]);

  const canSave = Boolean(caldavUrl.trim() && email.trim() && appPassword.trim()) && !submitting;

  const buildPayload = (): DeveloperCalDavCredentials | null => {
    const url = caldavUrl.trim();
    const mail = email.trim();
    const pass = appPassword.trim();
    if (!url || !mail || !pass) return null;
    return { appPassword: pass, caldavUrl: url, email: mail };
  };

  const handleInferEmail = () => {
    const inferred = inferMailRuEmailFromCalDavUrl(caldavUrl);
    if (inferred) setEmail(inferred);
  };

  const handleTest = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setTesting(true);
    setError(null);
    setTestOk(false);
    setSavedOk(false);
    try {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await fetchCalDavCalendarEventsFromApi({
        appPassword: payload.appPassword,
        caldavUrl: payload.caldavUrl,
        email: payload.email,
        timeMax: weekLater.toISOString(),
        timeMin: now.toISOString(),
      });
      setTestOk(true);
    } catch {
      setError(t('sprintPlanner.swimlane.calendar.testFailed'));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    setError(null);
    setSavedOk(false);
    try {
      setStored(payload);
      setSavedOk(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = () => {
    setStored(null);
    setCaldavUrl('');
    setEmail('');
    setAppPassword('');
    setError(null);
    setTestOk(false);
    setSavedOk(false);
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {t('sprintPlanner.swimlane.calendar.caldavUrl')}
        </span>
        <Input
          autoComplete="off"
          value={caldavUrl}
          onBlur={handleInferEmail}
          onChange={(e) => setCaldavUrl(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {t('sprintPlanner.swimlane.calendar.email')}
        </span>
        <Input
          autoComplete="username"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {t('sprintPlanner.swimlane.calendar.appPassword')}
        </span>
        <Input
          autoComplete="off"
          type="password"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
        />
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('sprintPlanner.swimlane.calendar.hint')}
      </p>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {testOk ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {t('sprintPlanner.swimlane.calendar.testOk')}
        </p>
      ) : null}
      {savedOk ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {t('sprintPlanner.swimlane.calendar.savedOk')}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {stored ? (
          <Button type="button" variant="ghost" onClick={handleRemove}>
            {t('sprintPlanner.swimlane.calendar.remove')}
          </Button>
        ) : null}
        <Button
          disabled={!canSave || testing}
          type="button"
          variant="secondary"
          onClick={handleTest}
        >
          {testing
            ? t('sprintPlanner.swimlane.calendar.testing')
            : t('sprintPlanner.swimlane.calendar.test')}
        </Button>
        <Button disabled={!canSave} type="button" onClick={handleSave}>
          {submitting
            ? t('sprintPlanner.swimlane.calendar.saving')
            : t('sprintPlanner.swimlane.calendar.save')}
        </Button>
      </div>
    </div>
  );
}
