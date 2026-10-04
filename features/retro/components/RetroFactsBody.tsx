'use client';

import type { RetroFacts, RetroQueueStage } from '@/lib/retro/retroFacts';

import { useI18n } from '@/contexts/LanguageContext';

import { RetroFactsMetricRow } from './RetroFactsMetricRow';
import { RetroFactsPairRow } from './RetroFactsPairRow';
import {
  retroFactsCaptionClass,
  retroFactsPairGridClass,
  retroFactsSectionTitleClass,
  retroFactsTableClass,
} from './retroUi';

function formatDays(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function formatSp(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatAsOf(language: string, ms: number): string {
  return new Date(ms).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
}

function scopeRows(
  facts: RetroFacts,
  t: (key: string, params?: Record<string, number | string>) => string
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (facts.addedAfterStart > 0) {
    rows.push({ label: t('retro.facts.added'), value: String(facts.addedAfterStart) });
  }
  if (facts.declined > 0) {
    rows.push({ label: t('retro.facts.declined'), value: String(facts.declined) });
  }
  if (facts.closedTotal > 0 && facts.closedTotal !== facts.committedDone) {
    rows.push({ label: t('retro.facts.closed'), value: String(facts.closedTotal) });
  }
  if (facts.carryOver.kind === 'unavailable') {
    rows.push({ label: t('retro.facts.carry'), value: '—' });
  } else if (facts.carryOver.count > 0) {
    rows.push({ label: t('retro.facts.carry'), value: String(facts.carryOver.count) });
  }
  return rows;
}

function scopeNotes(
  facts: RetroFacts,
  t: (key: string) => string
): string {
  const notes = [t('retro.facts.committedApprox')];
  if (facts.carryOver.kind === 'forecast' && facts.carryOver.count > 0) {
    notes.push(t('retro.facts.carryForecast'));
  }
  if (facts.carryOver.kind === 'unavailable') {
    notes.push(t('retro.facts.carryUnavailable'));
  }
  return notes.join(' ');
}

function caveatLines(
  facts: RetroFacts,
  t: (key: string, params?: Record<string, number | string>) => string
): string[] {
  const { dataQuality } = facts;
  const lines = [
    dataQuality.unassigned > 0
      ? `${t('retro.facts.footerUnassigned')} · ${dataQuality.unassigned}`
      : null,
    dataQuality.estimateDrift.count > 0
      ? `${t('retro.facts.footerDrift')} · ${t('retro.facts.footerDriftValue', {
        count: dataQuality.estimateDrift.count,
        from: formatSp(dataQuality.estimateDrift.fromSp),
        to: formatSp(dataQuality.estimateDrift.toSp),
      })}`
      : null,
    dataQuality.missingCreatedAt > 0
      ? `${t('retro.facts.footerMissingCreated')} · ${dataQuality.missingCreatedAt}`
      : null,
    dataQuality.missingStatusHistory > 0
      ? `${t('retro.facts.footerNoHistory')} · ${dataQuality.missingStatusHistory}`
      : null,
    dataQuality.closedWithoutTransition > 0
      ? `${t('retro.facts.footerClosedWithoutTransition')} · ${dataQuality.closedWithoutTransition}`
      : null,
  ];
  return lines.filter((line): line is string => line != null);
}

export function RetroFactsBody({ facts, language }: { facts: RetroFacts; language: string }) {
  const { t } = useI18n();
  const committedPercent = facts.committed > 0
    ? Math.round((100 * facts.committedDone) / facts.committed)
    : 0;
  const stageName = (stage: RetroQueueStage) => t(`retro.facts.stage.${stage}`);
  const days = (value: number) => t('retro.facts.days', { value: formatDays(value) });
  const secondary = scopeRows(facts, t);
  const caveats = caveatLines(facts, t);
  const efficiency = facts.flow?.efficiencyPercent ?? 0;

  return (
    <div className="space-y-4 text-xs leading-4 text-gray-700 dark:text-gray-300">
      <p className={retroFactsCaptionClass}>
        {facts.sprintOpen
          ? t('retro.facts.periodOpen', { date: formatAsOf(language, facts.asOfMs) })
          : t('retro.facts.periodClosed', { date: formatAsOf(language, facts.asOfMs) })}
        <span className="mt-0.5 block">{t('retro.facts.workdays')}</span>
      </p>

      <section className="space-y-1.5">
        <h3 className={retroFactsSectionTitleClass}>{t('retro.facts.composition')}</h3>
        <p className={retroFactsCaptionClass}>{scopeNotes(facts, t)}</p>
        <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {t('retro.facts.summary', {
            committed: facts.committed,
            done: facts.committedDone,
            percent: committedPercent,
          })}
        </p>
        {secondary.length > 0 ? (
          <div className={retroFactsTableClass}>
            {secondary.map((row) => (
              <RetroFactsMetricRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-1.5">
        <h3 className={retroFactsSectionTitleClass}>{t('retro.facts.flow')}</h3>
        {facts.cycleTime ? (
          <div className={retroFactsTableClass}>
            <div className={`${retroFactsPairGridClass} py-1 ${retroFactsCaptionClass}`}>
              <span />
              <span className="text-right">{t('retro.facts.mean')}</span>
              <span className="text-right">{t('retro.facts.p90')}</span>
            </div>
            <RetroFactsPairRow
              label={t('retro.facts.cycleTime')}
              mean={days(facts.cycleTime.meanDays)}
              p90={days(facts.cycleTime.p90Days)}
            />
          </div>
        ) : (
          <p className={retroFactsCaptionClass}>{t('retro.facts.cycleEmpty')}</p>
        )}
        {facts.cycleTime ? (
          <p className={retroFactsCaptionClass}>
            {t('retro.facts.sample', { count: facts.cycleTime.sampleSize })}
          </p>
        ) : null}
        {facts.flow ? (
          <>
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <span className="text-gray-500 dark:text-gray-400">{t('retro.facts.efficiency')}</span>
              <span className="font-medium tabular-nums text-gray-800 dark:text-gray-100">
                {`${facts.flow.efficiencyPercent}%`}
              </span>
            </div>
            <div
              aria-label={`${efficiency}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={efficiency}
              className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600"
              role="progressbar"
            >
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${efficiency}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-2 dark:border-gray-700">
              <div>
                <div className={retroFactsCaptionClass}>{t('retro.facts.coding')}</div>
                <div className="mt-0.5 font-medium tabular-nums text-gray-800 dark:text-gray-100">
                  {days(facts.flow.coding.meanDays)}
                </div>
              </div>
              <div>
                <div className={retroFactsCaptionClass}>{t('retro.facts.waiting')}</div>
                <div className="mt-0.5 font-medium tabular-nums text-gray-800 dark:text-gray-100">
                  {days(facts.flow.waiting.meanDays)}
                </div>
              </div>
            </div>
            {facts.flow.noCodingCount > 0 ? (
              <p className={retroFactsCaptionClass}>
                {t('retro.facts.noCoding', {
                  count: facts.flow.noCodingCount,
                  total: facts.flow.population,
                })}
              </p>
            ) : null}
          </>
        ) : (
          <p className={retroFactsCaptionClass}>{t('retro.facts.efficiencyEmpty')}</p>
        )}
      </section>

      <section className="space-y-1.5">
        <h3 className={retroFactsSectionTitleClass}>{t('retro.facts.bottleneck')}</h3>
        {facts.bottleneck ? (
          <div className={retroFactsTableClass}>
            <div className={`${retroFactsPairGridClass} py-1 ${retroFactsCaptionClass}`}>
              <span />
              <span className="text-right">{t('retro.facts.mean')}</span>
              <span className="text-right">{t('retro.facts.p90')}</span>
            </div>
            <RetroFactsPairRow
              label={stageName(facts.bottleneck.stage)}
              mean={days(facts.bottleneck.meanDays)}
              p90={days(facts.bottleneck.p90Days)}
            />
            {facts.bottleneckRunnerUp ? (
              <RetroFactsPairRow
                label={stageName(facts.bottleneckRunnerUp.stage)}
                mean={days(facts.bottleneckRunnerUp.meanDays)}
                p90={days(facts.bottleneckRunnerUp.p90Days)}
              />
            ) : null}
          </div>
        ) : (
          <p className={retroFactsCaptionClass}>{t('retro.facts.bottleneckNone')}</p>
        )}
        {facts.bottleneck ? (
          <p className={retroFactsCaptionClass}>
            {t('retro.facts.sample', { count: facts.bottleneck.sampleSize })}
          </p>
        ) : null}
      </section>

      {facts.outliers.length > 0 ? (
        <section className="space-y-1.5">
          <h3 className={retroFactsSectionTitleClass}>{t('retro.facts.outliers')}</h3>
          <div className={retroFactsTableClass}>
            {facts.outliers.map((outlier) => (
              <div key={outlier.id} className="flex w-full min-w-0 items-start gap-2 py-1.5">
                <span className="shrink-0 font-medium tabular-nums text-gray-800 dark:text-gray-100">
                  {outlier.id}
                </span>
                <span className="min-w-0 flex-1 break-words text-gray-500 dark:text-gray-400">
                  {outlier.name}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-gray-800 dark:text-gray-100">
                  {days(outlier.days)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {caveats.length > 0 ? (
        <section className="space-y-1">
          <h3 className={retroFactsSectionTitleClass}>{t('retro.facts.footer')}</h3>
          <ul className={`space-y-1 ${retroFactsCaptionClass}`}>
            {caveats.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
