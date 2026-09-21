'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { ZIndex } from '@/constants';
import { useChristmasThemeStorage, useThemeStorage } from '@/hooks/useLocalStorage';

const SnowfallEffect = dynamic(
  () => import('./SnowfallEffect').then((mod) => mod.SnowfallEffect),
  { ssr: false }
);

function isInChristmasPeriod(): boolean {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  if (month === 11 && day >= 15) {
    return true;
  }
  if (month === 0 && day <= 15) {
    return true;
  }
  return false;
}

export function Snow() {
  const [theme] = useThemeStorage();
  const [christmasThemeEnabled] = useChristmasThemeStorage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- гидратация: снег только на клиенте
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;
  if (!isInChristmasPeriod() || !christmasThemeEnabled) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none ${ZIndex.class('overlay')} overflow-hidden`}>
      <SnowfallEffect theme={theme} />
    </div>
  );
}
