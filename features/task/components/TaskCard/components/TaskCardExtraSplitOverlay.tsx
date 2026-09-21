import { formatPointsForDisplay } from '@/lib/pointsUtils';

interface TaskCardExtraSplitOverlayProps {
  dividerBgClass: string;
  extraSP: number;
  isDark: boolean;
  isQATask: boolean;
  isVeryNarrow: boolean;
  leftPercent: number;
  qaRightBgColor?: string;
  rightPercent: number;
  showTpLabels: boolean;
}

export function TaskCardExtraSplitOverlay({
  isQATask,
  qaRightBgColor,
  rightPercent,
  dividerBgClass,
  leftPercent,
  extraSP,
  isVeryNarrow,
  isDark,
  showTpLabels,
}: TaskCardExtraSplitOverlayProps) {
  return (
    <>
      {isQATask && qaRightBgColor && (
        <div
          className="absolute right-0 top-0 bottom-0 rounded-r-lg pointer-events-none"
          style={{ width: `${rightPercent}%`, backgroundColor: qaRightBgColor }}
        />
      )}
      <div
        className="absolute right-0 top-0 bottom-0 rounded-r-lg pointer-events-none bg-white/40 dark:bg-black/25"
        style={{ width: `${rightPercent}%` }}
      />
      <div
        className={`absolute top-0 bottom-0 w-0.5 pointer-events-none z-10 ${dividerBgClass}`}
        style={{ left: `${leftPercent}%` }}
      />
      {extraSP > 0 && !isVeryNarrow && (
        <span
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold whitespace-nowrap z-10 ${isDark ? 'text-white/95' : 'text-gray-800'}`}
          style={{
            left: `${leftPercent}%`,
            width: `${rightPercent}%`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +{formatPointsForDisplay(extraSP)} {showTpLabels ? 'tp' : 'sp'}
        </span>
      )}
    </>
  );
}
