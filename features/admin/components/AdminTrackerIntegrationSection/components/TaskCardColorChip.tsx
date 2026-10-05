import { TextTooltip } from '@/components/TextTooltip';
import { getSwimlaneTaskCardChipClassNames } from '@/utils/statusColors';

export function TaskCardColorChip({ colorKey }: { colorKey: string }) {
  const k = colorKey.trim();
  if (!k) {
    return null;
  }
  return (
    <TextTooltip content={k}>
      <span aria-hidden className={getSwimlaneTaskCardChipClassNames(k)} />
    </TextTooltip>
  );
}
