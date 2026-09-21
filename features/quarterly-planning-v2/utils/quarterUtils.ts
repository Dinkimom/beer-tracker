import type { Quarter } from '@/types';

export function getCurrentQuarter(): { year: number; quarter: Quarter } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = (Math.floor(month / 3) + 1) as Quarter;

  return { year, quarter };
}
