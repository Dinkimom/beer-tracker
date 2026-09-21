/** Компактный — бейзлайн поверх карточек. Без пересечений — бейзлайн занимает слой. */
export type SwimlaneBaselineLayoutMode = 'compact' | 'noOverlap';

export const SWIMLANE_BASELINE_LAYOUT_MODES: readonly SwimlaneBaselineLayoutMode[] = [
  'compact',
  'noOverlap',
];

/** Старый boolean `swimlaneOverdueVisible`: true → без пересечений, false → компактный. */
export function parseSwimlaneBaselineLayoutMode(raw: unknown): SwimlaneBaselineLayoutMode {
  if (raw === 'compact' || raw === false) {
    return 'compact';
  }
  return 'noOverlap';
}

export function resolveSwimlaneBaselinesForLayerPacking<T>(
  baselines: T[],
  mode: SwimlaneBaselineLayoutMode
): T[] {
  return mode === 'noOverlap' ? baselines : [];
}
