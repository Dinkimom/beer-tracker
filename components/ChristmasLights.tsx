'use client';

import { useEffect, useRef, useState } from 'react';

const LIGHT_COLORS = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#ec4899'];
/** Шаг между лампочками, px: на 1400px шапки — около 30 лампочек. */
const LIGHT_SPACING = 48;
/** Провод крепится на этой высоте и провисает к лампочке; вся гирлянда висит в верхнем отступе шапки (pt-3), не задевая кнопки. */
const WIRE_Y = 1;
const SAG_CONTROL_Y = 9;
const SOCKET_Y = 4.5;
const BULB_Y = 10;
const HEIGHT = 17;

/** Провод: дуги между точками крепления, лампочка висит в нижней точке каждой дуги. */
function buildWirePath(count: number): string {
  let path = `M 0 ${WIRE_Y}`;
  for (let i = 0; i < count; i++) {
    const x = (i + 1) * LIGHT_SPACING;
    path += ` Q ${x - LIGHT_SPACING / 2} ${SAG_CONTROL_Y} ${x} ${WIRE_Y}`;
  }
  return path;
}

export function ChristmasLights() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setWidth(container.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const count = Math.ceil(width / LIGHT_SPACING);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      style={{ height: HEIGHT }}
    >
      {count > 0 ? (
        <svg height={HEIGHT} width={count * LIGHT_SPACING}>
          <path
            className="stroke-green-800/70 dark:stroke-green-700/70"
            d={buildWirePath(count)}
            fill="none"
            strokeWidth={1}
          />
          {Array.from({ length: count }, (_, i) => {
            const x = i * LIGHT_SPACING + LIGHT_SPACING / 2;
            const color = LIGHT_COLORS[i % LIGHT_COLORS.length];
            return (
              <g key={i}>
                <rect
                  className="fill-green-800 dark:fill-green-700"
                  height={3}
                  rx={0.5}
                  width={3.5}
                  x={x - 1.75}
                  y={SOCKET_Y}
                />
                <g
                  className="christmas-light"
                  style={{ animationDelay: `${-((i * 0.7) % 2.4)}s`, color }}
                >
                  <circle cx={x} cy={BULB_Y} fill="currentColor" opacity={0.3} r={6.5} />
                  <ellipse cx={x} cy={BULB_Y + 0.5} fill="currentColor" rx={3} ry={4.2} />
                  <ellipse cx={x - 1} cy={BULB_Y - 0.5} fill="white" opacity={0.6} rx={0.8} ry={1.4} />
                </g>
              </g>
            );
          })}
        </svg>
      ) : null}
    </div>
  );
}
