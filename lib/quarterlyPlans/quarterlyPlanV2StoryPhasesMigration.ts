/** Старый PK — одна фаза на story; discovery + delivery требуют PK по id. */
export function isLegacyStoryPhasesPrimaryKey(pkColumnNames: readonly string[]): boolean {
  if (pkColumnNames.length !== 2) return false;
  const set = new Set(pkColumnNames);
  return set.has('plan_id') && set.has('story_key') && !set.has('id');
}

export const STORY_PHASES_PLAN_STORY_KIND_UNIQUE_INDEX =
  'uq_quarterly_plan_v2_story_phases_plan_story_kind';
