import { getPartsPerDay } from '@/constants';

const TIC_TAC_TOE_CARD_SPAN = 2;

export function resolveTicTacToeCardSize(
  day: number,
  part: number,
  timelineTotalParts: number
): { height: number; width: number } {
  const startCell = day * getPartsPerDay() + part;
  const remaining = Math.max(1, timelineTotalParts - startCell);
  return {
    height: TIC_TAC_TOE_CARD_SPAN,
    width: Math.max(1, Math.min(TIC_TAC_TOE_CARD_SPAN, remaining)),
  };
}
