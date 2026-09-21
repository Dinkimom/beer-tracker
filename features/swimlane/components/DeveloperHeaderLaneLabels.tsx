'use client';

type DeveloperHeaderLaneLabelAccent = 'calendar' | 'fact';

export interface DeveloperHeaderLaneLabelItem {
  accent: DeveloperHeaderLaneLabelAccent;
  heightPx: number;
  label: string;
  topPx: number;
}

const ACCENT_TEXT_CLASS: Record<DeveloperHeaderLaneLabelAccent, string> = {
  calendar: 'text-sky-700 dark:text-sky-400',
  fact: 'text-ds-text-muted',
};

interface DeveloperHeaderLaneLabelsProps {
  items: DeveloperHeaderLaneLabelItem[];
}

/**
 * Подписи вторичных дорожек у правого края колонки исполнителя —
 * рядом с полосой таймлайна, которую они подписывают.
 */
export function DeveloperHeaderLaneLabels({ items }: DeveloperHeaderLaneLabelsProps) {
  if (items.length === 0) return null;

  return (
    <>
      {items.map((item) => (
        <div
          key={`${item.accent}-${item.topPx}`}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 flex items-center justify-end px-2"
          style={{ top: item.topPx, height: item.heightPx }}
        >
          <span
            className={`truncate text-[10px] font-semibold uppercase tracking-wide ${ACCENT_TEXT_CLASS[item.accent]}`}
          >
            {item.label}
          </span>
        </div>
      ))}
    </>
  );
}
