import { CARD_MARGIN } from '@/constants';

/** Long-hover раскрывает карточку по тексту, но не шире стольких частей таймлайна. */
export const TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS = 4;

const TEXT_FIT_EPSILON_PX = 0.5;
/** Запас на смену горизонтального паддинга карточки при более широком widthPercent. */
const HOVER_EXPAND_FIT_SLACK_PX = 8;

export function resolveHoverExpandTargetDurationParts(params: {
  currentDurationParts: number;
  measuredFitDurationParts: number | null;
}): number {
  if (params.currentDurationParts >= TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS) {
    return params.currentDurationParts;
  }
  const fit = params.measuredFitDurationParts ?? TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS;
  return Math.min(
    TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS,
    Math.max(params.currentDurationParts, fit)
  );
}

export function cardWidthPxForDurationParts(params: {
  durationParts: number;
  timelineTotalParts: number;
  timelineWidthPx: number;
}): number {
  if (params.timelineTotalParts <= 0) return 0;
  return (
    (params.durationParts / params.timelineTotalParts) * params.timelineWidthPx -
    CARD_MARGIN * 2
  );
}

function durationPartsForCardWidthPx(params: {
  cardWidthPx: number;
  timelineTotalParts: number;
  timelineWidthPx: number;
}): number {
  if (params.timelineWidthPx <= 0) return 0;
  return (
    ((params.cardWidthPx + CARD_MARGIN * 2) / params.timelineWidthPx) * params.timelineTotalParts
  );
}

function resolveSmallestFittingWidthPx(params: {
  fitsAt: (widthPx: number) => boolean;
  maxWidthPx: number;
  minWidthPx: number;
}): number {
  if (params.minWidthPx >= params.maxWidthPx || params.fitsAt(params.minWidthPx)) {
    return params.minWidthPx;
  }
  if (!params.fitsAt(params.maxWidthPx)) return params.maxWidthPx;
  let lo = params.minWidthPx;
  let hi = params.maxWidthPx;
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2;
    if (params.fitsAt(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

function contentWidthAtCardWidth(params: {
  cardWidthPx: number;
  currentCardWidthPx: number;
  currentContentWidthPx: number;
}): number {
  return params.currentContentWidthPx + (params.cardWidthPx - params.currentCardWidthPx);
}

export function resolveHoverExpandFitDurationParts(input: {
  availableHeightPx: number;
  currentCardWidthPx: number;
  currentContentWidthPx: number;
  currentDurationParts: number;
  measureHeightAtContentWidth: (contentWidthPx: number) => number;
  timelineTotalParts: number;
  timelineWidthPx: number;
}): number {
  const fallback = resolveHoverExpandTargetDurationParts({
    currentDurationParts: input.currentDurationParts,
    measuredFitDurationParts: null,
  });
  if (input.currentDurationParts >= TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS) {
    return input.currentDurationParts;
  }
  if (
    input.availableHeightPx <= 0 ||
    input.timelineWidthPx <= 0 ||
    input.currentCardWidthPx <= 0 ||
    input.timelineTotalParts <= 0
  ) {
    return fallback;
  }

  const maxCardWidthPx = Math.max(
    input.currentCardWidthPx,
    cardWidthPxForDurationParts({
      durationParts: TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS,
      timelineTotalParts: input.timelineTotalParts,
      timelineWidthPx: input.timelineWidthPx,
    })
  );
  const contentAt = (cardWidthPx: number) =>
    contentWidthAtCardWidth({
      cardWidthPx,
      currentCardWidthPx: input.currentCardWidthPx,
      currentContentWidthPx: input.currentContentWidthPx,
    });
  if (input.measureHeightAtContentWidth(contentAt(input.currentCardWidthPx)) <= 0) {
    return fallback;
  }

  const fittedCardWidthPx = resolveSmallestFittingWidthPx({
    fitsAt: (cardWidthPx) =>
      input.measureHeightAtContentWidth(contentAt(cardWidthPx)) <=
      input.availableHeightPx + TEXT_FIT_EPSILON_PX,
    maxWidthPx: maxCardWidthPx,
    minWidthPx: input.currentCardWidthPx,
  });
  const cardWidthPx =
    fittedCardWidthPx <= input.currentCardWidthPx + TEXT_FIT_EPSILON_PX
      ? input.currentCardWidthPx
      : Math.min(maxCardWidthPx, fittedCardWidthPx + HOVER_EXPAND_FIT_SLACK_PX);
  return resolveHoverExpandTargetDurationParts({
    currentDurationParts: input.currentDurationParts,
    measuredFitDurationParts: durationPartsForCardWidthPx({
      cardWidthPx,
      timelineTotalParts: input.timelineTotalParts,
      timelineWidthPx: input.timelineWidthPx,
    }),
  });
}
