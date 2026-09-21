import type { Quarter } from '@/types';

export function getQuarterAndYear(date: Date | string): { quarter: Quarter; year: number } {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const quarter = (Math.floor(month / 3) + 1) as Quarter;
  return { quarter, year };
}

export function formatQuarterYear(quarter: number, year: number): string {
  return `Q${quarter} ${year}`;
}

