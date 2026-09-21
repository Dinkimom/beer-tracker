'use client';

import {
  CustomSelect,
  type CustomSelectOption,
} from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { plannerStatusPaletteLabel } from '@/features/admin/plannerIntegrationPaletteLabel';
import { defaultPaletteKeyForTrackerStatus } from '@/lib/trackerIntegration/statusPalette';
import { canonicalPaletteKey } from '@/utils/statusColors';

import { STATUS_PALETTE_OPTIONS } from '../constants';

import { TaskCardColorChip } from './TaskCardColorChip';

export function AdminStatusPaletteSelect({
  className,
  onPaletteChange,
  statusKey,
  statusTypeKey,
  storedPaletteKey,
}: {
  className?: string;
  onPaletteChange: (paletteKey: string) => void;
  statusKey: string;
  statusTypeKey?: string;
  storedPaletteKey: string;
}) {
  const { has, t } = useI18n();
  const paletteLabel = (key: string) => plannerStatusPaletteLabel(key, t, has);

  /** Тот же дефолт, что у `resolveStatusColorKey` на клиенте (ключ статуса → тип). */
  const typeDefaultPalette =
    defaultPaletteKeyForTrackerStatus(statusKey, statusTypeKey) ?? statusKey;

  const resolveColorKey = (stored: string) =>
    stored.trim() ? stored : typeDefaultPalette;

  const options: CustomSelectOption<string>[] = [
    { label: paletteLabel(typeDefaultPalette), value: '' },
    ...STATUS_PALETTE_OPTIONS.map((pk) => ({
      label: paletteLabel(pk),
      value: pk,
    })),
  ];

  const value = storedPaletteKey.trim()
    ? canonicalPaletteKey(storedPaletteKey)
    : '';

  const cardTitle = t('admin.plannerIntegration.statusMapping.cardColorTitle', {
    status: paletteLabel(typeDefaultPalette),
  });

  const renderOptionContent = (opt: CustomSelectOption<string>) => {
    const ck = resolveColorKey(opt.value);
    return (
      <span className="flex items-center gap-2">
        <TaskCardColorChip colorKey={ck} />
        <span className="min-w-0 flex-1 leading-snug">
          {paletteLabel(ck)}
        </span>
      </span>
    );
  };

  return (
    <CustomSelect
      className={className ?? 'w-full'}
      options={options}
      renderOption={renderOptionContent}
      renderTriggerValue={({ value: v }) => renderOptionContent({ label: '', value: v })}
      searchPlaceholder={t('admin.plannerIntegration.statusMapping.searchPalette')}
      searchable
      size="compact"
      title={cardTitle}
      value={value}
      onChange={(next) => onPaletteChange(next)}
    />
  );
}
