'use client';

import type { RectBox } from './plannerOnboardingGeometry';

import { useId } from 'react';

const SCRIM = 'rgba(15, 23, 42, 0.55)';

export function PlannerOnboardingScrim({ holes }: { holes: readonly RectBox[] }) {
  const maskId = useId().replaceAll(':', '');

  if (holes.length === 0) {
    return <div className="absolute inset-0 bg-slate-900/55" />;
  }

  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <mask id={maskId}>
          <rect fill="white" height="100%" width="100%" />
          {holes.map((hole) => (
            <rect
              key={`${hole.left}:${hole.top}:${hole.width}:${hole.height}`}
              fill="black"
              height={hole.height}
              rx={8}
              width={hole.width}
              x={hole.left}
              y={hole.top}
            />
          ))}
        </mask>
      </defs>
      <rect fill={SCRIM} height="100%" mask={`url(#${maskId})`} width="100%" />
    </svg>
  );
}
