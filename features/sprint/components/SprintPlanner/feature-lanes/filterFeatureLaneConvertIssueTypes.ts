import type { CustomSelectOption } from '@/components/CustomSelect';

const FEATURE_PARENT_TYPE_RE = /(epic|story|эпик|стори|история)/i;

/** Типы очереди, похожие на эпик/стори; если таких нет — все типы очереди. */
export function filterFeatureLaneConvertIssueTypes(
  options: CustomSelectOption<string>[]
): CustomSelectOption<string>[] {
  const filtered = options.filter(
    (option) =>
      FEATURE_PARENT_TYPE_RE.test(option.value) || FEATURE_PARENT_TYPE_RE.test(option.label)
  );
  return filtered.length > 0 ? filtered : options;
}
