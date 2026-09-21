'use client';

import { ZIndex } from '@/constants';

import { getChristmasBulbShellColor, getChristmasBulbStyles } from './christmasLightsHelpers';

interface ChristmasLightBulbProps {
  baseY: number;
  index: number;
  light: {
    color: string;
    id: string;
    isOn: boolean;
    verticalOffset: number;
  };
  lightsCount: number;
  theme: string;
  waveAmplitude: number;
}

export function ChristmasLightBulb({
  baseY,
  index,
  light,
  lightsCount,
  theme,
  waveAmplitude,
}: ChristmasLightBulbProps) {
  const progress = lightsCount > 1 ? index / (lightsCount - 1) : 0;
  const waveY = Math.sin(progress * Math.PI * 2) * waveAmplitude;
  const lampY = baseY + waveY + light.verticalOffset;
  const bulbStyles = getChristmasBulbStyles(light);
  const shellColor = getChristmasBulbShellColor(theme);

  return (
    <div
      key={light.id}
      className={`absolute ${ZIndex.class('stickyInContent')} flex flex-col items-center`}
      style={{
        left: `${progress * 100}%`,
        top: `${lampY - 10}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        className="relative transition-all duration-300"
        style={{
          width: '12px',
          height: '18px',
        }}
      >
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 ${ZIndex.class('stickyElevated')}`}
          style={{
            width: '6px',
            height: '8px',
            backgroundColor: shellColor,
            borderRadius: '1px 1px 0 0',
            boxShadow: '0 0px 0px rgba(0, 0, 0, 0.225), inset 0 1px 1px rgba(255,255,255,0.15)',
          }}
        />
        <div
          className="absolute top-4 left-1/2 transition-all duration-300"
          style={{
            width: '12px',
            height: '15px',
            backgroundColor: light.color,
            borderRadius: '35% 35% 50% 50% / 40% 40% 70% 70%',
            filter: bulbStyles.filter,
            opacity: bulbStyles.opacity,
            boxShadow: bulbStyles.boxShadow,
            transform: 'translateX(-50%)',
          }}
        />
        <div
          className="absolute top-6 left-1/2 pointer-events-none"
          style={{
            width: '4px',
            height: '8px',
            background:
              'radial-gradient(circle at 30% 30%, #ffffff83 0%, rgba(255, 255, 255, 0.594) 25%, rgba(255,255,255,0.5) 45%, transparent 70%)',
            borderRadius: '50%',
            opacity: bulbStyles.highlightOpacity,
            transform: 'translateX(-50%)',
          }}
        />
      </div>
    </div>
  );
}
