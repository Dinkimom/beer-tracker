import { isWeekend, countWorkingDays } from '../utils/dateUtils';

interface BurndownIdealState {
  lastWorkingDayIdealSP: number;
  lastWorkingDayIdealTP: number;
}

interface BurndownIdealValues {
  idealSP: number | undefined;
  idealTP: number | undefined;
  nextState: BurndownIdealState;
}

export function calculateBurndownIdealValues(
  date: Date,
  initialSP: number,
  initialTP: number,
  startDate: Date,
  totalWorkingDays: number,
  state: BurndownIdealState
): BurndownIdealValues {
  if (initialSP <= 0 && initialTP <= 0) {
    return {
      idealSP: undefined,
      idealTP: undefined,
      nextState: state,
    };
  }

  if (isWeekend(date)) {
    return {
      idealSP: state.lastWorkingDayIdealSP,
      idealTP: state.lastWorkingDayIdealTP,
      nextState: state,
    };
  }

  const workingDaysPassed = countWorkingDays(startDate, date);
  if (totalWorkingDays <= 0) {
    return {
      idealSP: undefined,
      idealTP: undefined,
      nextState: state,
    };
  }

  const progress = Math.min(workingDaysPassed / totalWorkingDays, 1);
  const idealSP = Math.max(0, initialSP * (1 - progress));
  const idealTP = Math.max(0, initialTP * (1 - progress));

  return {
    idealSP,
    idealTP,
    nextState: {
      lastWorkingDayIdealSP: idealSP,
      lastWorkingDayIdealTP: idealTP,
    },
  };
}

export function resolveBurndownRemainingValues(
  isDraft: boolean,
  isAfterCurrentDate: boolean,
  remainingSP: number,
  remainingTP: number
): { remainingSP: number | undefined; remainingTP: number | undefined } {
  const hideRemaining = isDraft || isAfterCurrentDate;
  return {
    remainingSP: hideRemaining ? undefined : remainingSP,
    remainingTP: hideRemaining ? undefined : remainingTP,
  };
}

export function formatBurndownChartDateLabel(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
}
