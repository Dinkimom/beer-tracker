'use client';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';

interface QuarterlyPlanBarIssueBadgeProps {
  /** Проблемы назначения (QI1–QI6). */
  issues: readonly string[];
  /** Риски, которые проблемой не считаются: дежурство в сроке (QV3). */
  risks: readonly string[];
}

/**
 * Значок на полосе: что с назначением не так, причины — в подсказке. Залитый кружок читается и поверх
 * штриховки. Проблема — жёлтый треугольник; только риск — приглушённый кружок «i». Нечего сказать — пусто.
 */
export function QuarterlyPlanBarIssueBadge({ issues, risks }: QuarterlyPlanBarIssueBadgeProps) {
  if (issues.length + risks.length === 0) return null;
  const problem = issues.length > 0;
  return (
    <TextTooltip
      content={
        <div className="flex flex-col gap-0.5">
          {[...issues, ...risks].map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      }
      side="top"
    >
      {/* Отступ справа — под рукоятку края. */}
      <span
        className={`relative mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          problem
            ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950'
            : 'bg-gray-500/70 text-white dark:bg-gray-400/70 dark:text-gray-950'
        }`}
      >
        <Icon className="h-2.5 w-2.5" name={problem ? 'alert-triangle' : 'circle-info'} />
      </span>
    </TextTooltip>
  );
}
