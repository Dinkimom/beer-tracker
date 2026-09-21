export function computeOccupancyRowScrollTargets(input: {
  bestLeftBarLeft: number;
  bestRightBarLeft: number;
  containerScrollLeft: number;
  cRectLeft: number;
  scrollPadding: number;
  showLeft: boolean;
  showRight: boolean;
  taskColumnWidth: number;
}): { targetLeft: number; targetRight: number } {
  const targetLeft = input.showLeft
    ? Math.max(
        0,
        input.containerScrollLeft +
          input.bestLeftBarLeft -
          input.cRectLeft -
          input.taskColumnWidth -
          input.scrollPadding
      )
    : 0;
  const targetRight = input.showRight
    ? Math.max(
        0,
        input.containerScrollLeft +
          input.bestRightBarLeft -
          input.cRectLeft -
          input.taskColumnWidth -
          input.scrollPadding
      )
    : 0;
  return { targetLeft, targetRight };
}
