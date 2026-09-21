import { getSwimlaneTaskCardChipClassNames } from '@/utils/statusColors';

export function TaskCardColorChip({ colorKey }: { colorKey: string }) {
  const k = colorKey.trim();
  if (!k) {
    return null;
  }
  return (
    <span
      aria-hidden
      className={getSwimlaneTaskCardChipClassNames(k)}
      title={k}
    />
  );
}
