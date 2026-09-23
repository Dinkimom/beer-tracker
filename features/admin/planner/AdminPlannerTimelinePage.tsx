'use client';

import type { PlannerGridMigrationPreview } from '@/lib/api/plannerTimeline';
import type { PlannerTimelineScale, TimeslotsPerDay } from '@/lib/plannerTimelineScale';
import type { AxiosError } from 'axios';
import type { FormEvent } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/contexts/LanguageContext';
import { useAdminOrganizationId } from '@/features/admin/AdminOrganizationIdContext';
import { adminFormRadio, cardBody, cardShell, hCard, muted, pageStack } from '@/features/admin/adminUiTokens';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { PlannerTimelineCustomStepsFields } from '@/features/admin/planner/PlannerTimelineCustomStepsFields';
import { PlannerTimelinePresetPreview } from '@/features/admin/planner/PlannerTimelinePresetPreview';
import {
  fetchAdminPlannerTimelineScale,
  patchAdminPlannerTimelineScale,
} from '@/lib/api/plannerTimeline';
import { readApiErrorMessage } from '@/lib/api/readApiError';
import {
  orderedPlannerTimelineSteps,
  plannerTimelineScalesEqual,
  presetPlannerTimelineSteps,
  rescalePlannerTimelineSteps,
} from '@/lib/plannerTimelineScale';

const SLOT_OPTIONS = [2, 3, 4] as const;
const UNIT_OPTIONS = ['timeslot', 'day', 'custom'] as const;

const UNIT_LABEL_KEY = {
  custom: 'admin.plannerTimeline.unitCustom',
  day: 'admin.plannerTimeline.unitDay',
  timeslot: 'admin.plannerTimeline.unitTimeslot',
} as const;

function draftWithTimeslots(scale: PlannerTimelineScale, timeslotsPerDay: TimeslotsPerDay): PlannerTimelineScale {
  if (scale.estimateUnit === 'custom' && scale.steps) {
    return {
      estimateUnit: 'custom',
      steps: rescalePlannerTimelineSteps(scale.steps, scale.timeslotsPerDay, timeslotsPerDay),
      timeslotsPerDay,
    };
  }
  return { estimateUnit: scale.estimateUnit, timeslotsPerDay };
}

function draftWithUnit(
  scale: PlannerTimelineScale,
  estimateUnit: (typeof UNIT_OPTIONS)[number]
): PlannerTimelineScale {
  if (estimateUnit !== 'custom') {
    return { estimateUnit, timeslotsPerDay: scale.timeslotsPerDay };
  }
  return {
    estimateUnit: 'custom',
    steps: scale.estimateUnit === 'custom' && scale.steps ? scale.steps : presetPlannerTimelineSteps(scale),
    timeslotsPerDay: scale.timeslotsPerDay,
  };
}

function readGridMigrationPreview(error: unknown): PlannerGridMigrationPreview | null {
  const data = (error as AxiosError<{ code?: string; preview?: PlannerGridMigrationPreview }>).response?.data;
  if (data?.code !== 'GRID_MIGRATION_REQUIRED' || !data.preview) return null;
  return data.preview;
}

export function AdminPlannerTimelinePage() {
  const { t } = useI18n();
  const connectOrgId = useAdminOrganizationId();
  const queryClient = useQueryClient();
  const { confirm, DialogComponent } = useConfirmDialog();
  const queryKey = ['planner-timeline-scale', connectOrgId] as const;
  const { data, isLoading, isError } = useQuery({
    enabled: Boolean(connectOrgId),
    queryFn: () => fetchAdminPlannerTimelineScale(connectOrgId),
    queryKey,
  });
  const [draft, setDraft] = useState<PlannerTimelineScale | null>(null);
  const [saving, setSaving] = useState(false);
  const scale = draft ?? data;
  const stepsValid = !scale || scale.estimateUnit !== 'custom' || orderedPlannerTimelineSteps(scale.steps ?? []) !== null;

  async function save(next: PlannerTimelineScale, confirmGridMigration = false) {
    const saved = await patchAdminPlannerTimelineScale(connectOrgId, {
      ...next,
      confirmGridMigration,
    });
    setDraft(null);
    queryClient.setQueryData(queryKey, saved);
    toast.success(t('admin.plannerTimeline.saved'));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!scale || !data || !stepsValid || plannerTimelineScalesEqual(scale, data)) return;
    setSaving(true);
    try {
      try {
        await save(scale);
      } catch (error) {
        const migration = readGridMigrationPreview(error);
        if (!migration) throw error;
        const accepted = await confirm(
          t('admin.plannerTimeline.gridConfirm', {
            comments: migration.comments,
            commentsShifted: migration.commentsShifted,
            positions: migration.positions,
            positionsShifted: migration.positionsShifted,
            segments: migration.segments,
            segmentsShifted: migration.segmentsShifted,
          }),
          {
            confirmText: t('admin.plannerTimeline.save'),
            title: t('admin.plannerTimeline.gridConfirmTitle'),
          }
        );
        if (!accepted) return;
        await save(scale, true);
      }
    } catch (error) {
      toast.error(readApiErrorMessage(error, t('admin.plannerTimeline.saveFailed')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={pageStack}>
      <AdminPageHeader title={t('admin.plannerTimeline.title')} />
      {DialogComponent}
      {!connectOrgId ? <p className={muted}>{t('admin.plannerTimeline.pickOrganization')}</p> : null}
      {isError ? <p className={muted}>{t('admin.plannerTimeline.loadFailed')}</p> : null}
      {scale && !isLoading ? (
        <form className={`${cardShell} ${cardBody} space-y-6 text-sm`} onSubmit={onSubmit}>
          <fieldset className="space-y-2">
            <legend className={hCard}>{t('admin.plannerTimeline.slotsTitle')}</legend>
            <p className={muted}>{t('admin.plannerTimeline.slotsHint')}</p>
            {SLOT_OPTIONS.map((slots) => (
              <label key={slots} className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <input
                  checked={scale.timeslotsPerDay === slots}
                  className={adminFormRadio}
                  name="timeslotsPerDay"
                  type="radio"
                  onChange={() => setDraft(draftWithTimeslots(scale, slots))}
                />
                {t(`admin.plannerTimeline.slots${slots}`)}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className={hCard}>{t('admin.plannerTimeline.unitTitle')}</legend>
            {UNIT_OPTIONS.map((unit) => (
              <label key={unit} className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <input
                  checked={scale.estimateUnit === unit}
                  className={adminFormRadio}
                  name="estimateUnit"
                  type="radio"
                  onChange={() => setDraft(draftWithUnit(scale, unit))}
                />
                {t(UNIT_LABEL_KEY[unit])}
              </label>
            ))}
          </fieldset>
          {scale.estimateUnit === 'custom' && scale.steps ? (
            <PlannerTimelineCustomStepsFields
              steps={scale.steps}
              timeslotsPerDay={scale.timeslotsPerDay}
              onChange={(steps) => setDraft({ ...scale, steps })}
            />
          ) : null}
          {scale.estimateUnit === 'custom' && !stepsValid ? (
            <p className={muted}>{t('admin.plannerTimeline.stepsInvalid')}</p>
          ) : null}
          <PlannerTimelinePresetPreview scale={scale} />
          <Button
            disabled={saving || !data || !stepsValid || plannerTimelineScalesEqual(scale, data)}
            type="submit"
            variant="primary"
          >
            {saving ? t('admin.plannerTimeline.saving') : t('admin.plannerTimeline.save')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
