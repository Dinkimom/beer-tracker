export function computeEffectiveColumns(params: {
  displayAsWeeks?: boolean;
  displayColumnCount?: number;
  workingDays: number;
}): number {
  const { displayAsWeeks, displayColumnCount, workingDays } = params;
  return displayAsWeeks && displayColumnCount != null ? displayColumnCount : workingDays;
}

export function computeOccupancyTableEmptyColSpan(params: {
  displayAsWeeks?: boolean;
  displayColumnCount?: number;
  quarterlySplitTaskColumns?: boolean;
  workingDays: number;
}): number {
  const taskColCount = params.quarterlySplitTaskColumns ? 2 : 1;
  return taskColCount + computeEffectiveColumns(params);
}
