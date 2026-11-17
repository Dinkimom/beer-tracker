'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { getAppVersionLabel } from '@/lib/appVersion';
import {
  appChangelogNotes,
  formatAppChangelogDate,
  readEmbeddedAppChangelog,
} from '@/lib/changelog/appChangelog';

import { SettingsSubPanel } from './SettingsSubPanel';

interface SettingsChangelogPanelProps {
  onBack: () => void;
  onClose: () => void;
}

export function SettingsChangelogPanel({ onBack, onClose }: SettingsChangelogPanelProps) {
  const { language, t } = useI18n();
  const releases = readEmbeddedAppChangelog();
  const currentVersion = getAppVersionLabel();

  return (
    <SettingsSubPanel title={t('settings.changelog.title')} onBack={onBack} onClose={onClose}>
      {releases.length === 0 ? (
        <p className="text-sm text-ds-text-muted">{t('settings.changelog.empty')}</p>
      ) : (
        <ol className="divide-y divide-ds-border-subtle">
          {releases.map((release) => {
            const notes = appChangelogNotes(release, language);
            const isCurrent = release.version === currentVersion;
            return (
              <li key={release.version} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      {release.version}
                    </h3>
                    {isCurrent ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                        {t('settings.changelog.current')}
                      </span>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs text-ds-text-muted" dateTime={release.date}>
                    {formatAppChangelogDate(release.date, language)}
                  </time>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-gray-700 dark:text-gray-200">
                  {notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </SettingsSubPanel>
  );
}
