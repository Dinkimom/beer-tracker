import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';

export type PlannerHatchTone = AvailabilityCardKind | 'neutral';

interface PlannerHatchToneColors {
  darkFill?: string;
  darkLine: string;
  lightFill?: string;
  lightLine: string;
}

export function plannerHatchImage(line: string): string {
  return `repeating-linear-gradient(-45deg, transparent 0 5px, ${line} 5px 6px)`;
}

/** Базовый фон под штриховку — совпадает с TimelineGrid и чипами отсутствия. */
export const PLANNER_HATCH_BASE_CLASS = '!bg-white dark:!bg-gray-800';

export const PLANNER_HATCH_TONES: Record<PlannerHatchTone, PlannerHatchToneColors> = {
  neutral: {
    lightLine: 'rgb(0 0 0 / 0.06)',
    darkLine: 'rgb(255 255 255 / 0.07)',
  },
  vacation: {
    lightFill: 'rgb(254 243 199 / 0.45)',
    lightLine: 'rgb(245 158 11 / 0.42)',
    darkFill: 'rgb(120 53 15 / 0.28)',
    darkLine: 'rgb(251 191 36 / 0.45)',
  },
  sick_leave: {
    lightFill: 'rgb(255 228 230 / 0.5)',
    lightLine: 'rgb(244 63 94 / 0.4)',
    darkFill: 'rgb(136 19 55 / 0.3)',
    darkLine: 'rgb(251 113 133 / 0.45)',
  },
  duty: {
    lightFill: 'rgb(237 233 254 / 0.5)',
    lightLine: 'rgb(139 92 246 / 0.4)',
    darkFill: 'rgb(76 29 149 / 0.3)',
    darkLine: 'rgb(167 139 250 / 0.45)',
  },
  'tech-sprint-web': {
    lightFill: 'rgb(224 242 254 / 0.5)',
    lightLine: 'rgb(14 165 233 / 0.4)',
    darkFill: 'rgb(12 74 110 / 0.32)',
    darkLine: 'rgb(56 189 248 / 0.45)',
  },
  'tech-sprint-back': {
    lightFill: 'rgb(209 250 229 / 0.5)',
    lightLine: 'rgb(16 185 129 / 0.4)',
    darkFill: 'rgb(6 78 59 / 0.32)',
    darkLine: 'rgb(52 211 153 / 0.45)',
  },
  'tech-sprint-qa': {
    lightFill: 'rgb(255 237 213 / 0.5)',
    lightLine: 'rgb(249 115 22 / 0.4)',
    darkFill: 'rgb(124 45 18 / 0.3)',
    darkLine: 'rgb(251 146 60 / 0.45)',
  },
};
