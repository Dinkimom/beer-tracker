import { defaultTaskCardSlotLayout, type TaskCardSlotLayout } from './taskCardSlots';

type TaskCardSlotPresetId = 'classic' | 'statusOnShortCards';

export function taskCardSlotPresetLayout(preset: TaskCardSlotPresetId): TaskCardSlotLayout {
  if (preset === 'statusOnShortCards') {
    return { ...defaultTaskCardSlotLayout(), hideFooter: 'never' };
  }
  return defaultTaskCardSlotLayout();
}
