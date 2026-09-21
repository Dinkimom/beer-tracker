'use client';

import { useMemo } from 'react';
import Snowfall from 'react-snowfall';

interface SnowfallEffectProps {
  theme: 'dark' | 'light';
}

function drawSnowflakeShape(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, centerY + radius);
  ctx.moveTo(centerX - radius, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.stroke();

  const diagonalRadius = radius * 0.7;
  ctx.beginPath();
  ctx.moveTo(centerX - diagonalRadius * 0.7, centerY - diagonalRadius * 0.7);
  ctx.lineTo(centerX + diagonalRadius * 0.7, centerY + diagonalRadius * 0.7);
  ctx.moveTo(centerX + diagonalRadius * 0.7, centerY - diagonalRadius * 0.7);
  ctx.lineTo(centerX - diagonalRadius * 0.7, centerY + diagonalRadius * 0.7);
  ctx.stroke();

  const branchLength = radius * 0.3;
  const positions = [
    { x: 0, y: -radius },
    { x: 0, y: radius },
    { x: -radius, y: 0 },
    { x: radius, y: 0 },
  ];

  for (const { x, y } of positions) {
    ctx.beginPath();
    ctx.moveTo(centerX + x, centerY + y);
    ctx.lineTo(centerX + x - branchLength * 0.5, centerY + y - branchLength * 0.5);
    ctx.moveTo(centerX + x, centerY + y);
    ctx.lineTo(centerX + x + branchLength * 0.5, centerY + y - branchLength * 0.5);
    ctx.stroke();
  }
}

function createSnowflakeCanvas(size: number, theme: 'dark' | 'light'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  ctx.clearRect(0, 0, size, size);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 3;

  if (theme === 'light') {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    drawSnowflakeShape(ctx, centerX, centerY, radius);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
  } else {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
  }

  drawSnowflakeShape(ctx, centerX, centerY, radius);
  return canvas;
}

export function SnowfallEffect({ theme }: SnowfallEffectProps) {
  const snowflakeImages = useMemo(
    () => [
      createSnowflakeCanvas(12, theme),
      createSnowflakeCanvas(16, theme),
      createSnowflakeCanvas(20, theme),
      createSnowflakeCanvas(24, theme),
    ],
    [theme]
  );

  return (
    <Snowfall
      changeFrequency={100}
      images={snowflakeImages}
      radius={[6, 12]}
      snowflakeCount={50}
      speed={[0.5, 1.5]}
      style={{
        height: '100%',
        position: 'fixed',
        width: '100%',
      }}
      wind={[-0.5, 0.5]}
    />
  );
}
