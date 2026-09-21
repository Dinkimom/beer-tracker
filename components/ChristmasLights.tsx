'use client';

import { useEffect, useRef, useState } from 'react';

import { useChristmasThemeStorage, useThemeStorage } from '@/hooks/useLocalStorage';

import { ChristmasLightBulb } from './ChristmasLightBulb';
import { randomizeChristmasLightState } from './christmasLightsHelpers';

const LIGHT_COLORS = ['#ff0000', '#ffff00', '#0099ff', '#00ff00', '#ff0000', '#ffff00', '#0099ff', '#00ff00'];

interface Light {
  color: string;
  delay: number;
  id: string;
  isOn: boolean;
  verticalOffset: number; // Смещение по вертикали для создания эффекта "висящих" лампочек
}

// Проверка, попадает ли текущая дата в период показа гирлянды (15 декабря - 15 января)
export const isInChristmasPeriod = (): boolean => {
  const now = new Date();
  const month = now.getMonth(); // 0 = январь, 11 = декабрь
  const day = now.getDate();

  // С 15 декабря по 31 декабря
  if (month === 11 && day >= 15) {
    return true;
  }
  // С 1 января по 15 января
  if (month === 0 && day <= 15) {
    return true;
  }

  return false;
};

export function ChristmasLights() {
  const [theme] = useThemeStorage();
  const [christmasThemeEnabled] = useChristmasThemeStorage();
  const [lights, setLights] = useState<Light[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  useEffect(() => {
    // Нам нужно установить флаг монтирования, чтобы избежать проблем с гидратацией.
    // Это осознанное использование setState внутри эффекта.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    setLights(
      Array.from({ length: 20 }, (_, i) => ({
        color: LIGHT_COLORS[i % LIGHT_COLORS.length],
        delay: i * 0.15, // Задержка для волнового эффекта
        id: `light-${i}-${Date.now()}-${Math.random()}`,
        isOn: Math.random() > 0.3, // Начальное состояние
        verticalOffset: (Math.random() - 0.5) * 8, // Случайное смещение от -4px до +4px
      }))
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLights((prev) => prev.map(randomizeChristmasLightState));
    }, 600);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width - 32); // Учитываем padding (2rem = 32px)
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (!isMounted || !isInChristmasPeriod() || !christmasThemeEnabled) return null;

  if (lights.length === 0) return null;

  const baseY = 12;
  const waveAmplitude = 3;
  const socketHeight = 4; // Высота основания лампочки
  const socketCenterOffset = socketHeight / 2;
  const wireExtension = 50;

  const wirePoints = lights.map((light, i) => {
    const progress = lights.length > 1 ? i / (lights.length - 1) : 0;
    const waveY = Math.sin(progress * Math.PI * 2) * waveAmplitude;
    const lampY = baseY + waveY + light.verticalOffset;
    const wireY = lampY - socketHeight + socketCenterOffset;
    return { progress, wireY };
  });

  const getWirePath = (width: number) => {
    if (wirePoints.length === 0) return '';

    const points = wirePoints.map(({ progress, wireY }) => ({
      x: progress * width,
      y: wireY,
    }));

    // Начальная точка - слева за пределами экрана
    const startX = -wireExtension;
    const startY = points[0].y;

    // Конечная точка - справа за пределами экрана
    const endX = width + wireExtension;
    const endY = points[points.length - 1].y;

    // Начинаем слева за пределами экрана
    let path = `M ${startX} ${startY}`;

    // Соединяем с первой лампочкой
    if (points.length > 0) {
      path += ` L ${points[0].x} ${points[0].y}`;
    }

    // Провод между лампочками
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Используем кривую Безье для плавного провода
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) * 0.5;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    // Заканчиваем справа за пределами экрана
    if (points.length > 0) {
      path += ` L ${endX} ${endY}`;
    }

    return path;
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 right-0 h-8 flex items-start justify-between px-4 overflow-visible pointer-events-none -mt-2"
    >
      {/* Провод гирлянды - изогнутый SVG путь */}
      <svg
        className="absolute top-0 left-4 h-8 pointer-events-none"
        preserveAspectRatio="none"
        style={{ width: `calc(100% - 2rem + ${wireExtension * 2}px)`, left: `calc(1rem - ${wireExtension}px)` }}
        viewBox={`${-wireExtension} 0 ${containerWidth + wireExtension * 2} 32`}
      >
        <path
          d={getWirePath(containerWidth)}
          fill="none"
          stroke={theme === 'dark' ? '#166534' : '#16a34a'}
          strokeWidth="2"
        />
      </svg>

      {/* Лампочки гирлянды */}
      {lights.map((light, index) => (
        <ChristmasLightBulb
          key={light.id}
          baseY={baseY}
          index={index}
          light={light}
          lightsCount={lights.length}
          theme={theme}
          waveAmplitude={waveAmplitude}
        />
      ))}
    </div>
  );
}

