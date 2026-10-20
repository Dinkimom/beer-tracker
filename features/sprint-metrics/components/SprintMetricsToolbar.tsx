'use client';

import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/CustomSelect';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const ALL_TEAMS = '__all__';
const QUARTER_OPTIONS = [2, 4, 6, 8] as const;
/** Как у фильтров бэклога: компактные пилюли на холсте. */
const PILL_CLASS = '!h-8 !px-2.5 !py-0 text-xs cursor-pointer transition-all duration-200 active:scale-[0.98]';

interface SprintMetricsToolbarProps {
  canExport: boolean;
  /** Прогресс фонового досчёта истории; null — всё посчитано. */
  progress: { done: number; total: number } | null;
  quarters: number;
  team: string | null;
  teams: string[];
  onExport: () => void;
  onQuartersChange: (quarters: number) => void;
  onTeamChange: (team: string | null) => void;
}

/** Контролы над островами в одну строку, как у бэклога и сгорания. */
export function SprintMetricsToolbar({
  canExport,
  progress,
  quarters,
  team,
  teams,
  onExport,
  onQuartersChange,
  onTeamChange,
}: SprintMetricsToolbarProps) {
  const { t } = useI18n();
  const teamOptions = [
    { label: t('sprintMetrics.filters.allTeams'), value: ALL_TEAMS },
    ...teams.map((name) => ({ label: name, value: name })),
  ];

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {teams.length > 1 ? (
        <div className="w-52 shrink-0">
          <CustomSelect
            options={teamOptions}
            size="compact"
            surface="glass"
            title={t('sprintMetrics.filters.team')}
            value={team ?? ALL_TEAMS}
            onChange={(value) => onTeamChange(value === ALL_TEAMS ? null : value)}
          />
        </div>
      ) : null}
      <div aria-label={t('sprintMetrics.filters.period')} className="flex shrink-0 gap-1" role="group">
        {QUARTER_OPTIONS.map((count) => (
          <Button
            key={count}
            aria-pressed={quarters === count}
            className={PILL_CLASS}
            type="button"
            variant={quarters === count ? 'accent' : 'outline'}
            onClick={() => onQuartersChange(count)}
          >
            {t('sprintMetrics.filters.quarters', { count })}
          </Button>
        ))}
      </div>
      {progress ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-ds-text-muted" role="status">
          <Icon className="h-3.5 w-3.5 animate-spin" name="spinner" />
          {t('sprintMetrics.states.pending', progress)}
        </span>
      ) : null}
      <Button
        className={`ml-auto inline-flex items-center gap-1.5 ${PILL_CLASS}`}
        disabled={!canExport}
        type="button"
        variant="outline"
        onClick={onExport}
      >
        <Icon className="h-3.5 w-3.5" name="file-text" />
        {t('sprintMetrics.actions.exportCsv')}
      </Button>
    </div>
  );
}
