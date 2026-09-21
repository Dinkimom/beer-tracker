import { ruPluralFormKey } from '@/lib/i18n/ruPluralFormKey';

export function invalidTasksRuNoun(count: number, t: (key: string) => string): string {
  return t(
    ruPluralFormKey(count, {
      few: 'sidebar.sprintStartChecklist.invalidTasksRu234',
      many: 'sidebar.sprintStartChecklist.invalidTasksRuMany',
      one: 'sidebar.sprintStartChecklist.invalidTasksRu1',
    }),
  );
}
