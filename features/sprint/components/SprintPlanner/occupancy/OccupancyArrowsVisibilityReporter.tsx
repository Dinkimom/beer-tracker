'use client';

import { useEffect, useMemo } from 'react';

import { useOccupancyArrowsRegister } from './OccupancyArrowsVisibilityCtx';

interface OccupancyArrowsVisibilityReporterProps {
  inView: boolean;
  taskIds: string[];
}

/** Вызывать из строки занятости внутри OccupancyLazyByViewport: сообщает, что якоря стрелок для taskIds в viewport (inView) или нет */
export function OccupancyArrowsVisibilityReporter({
  inView,
  taskIds,
}: OccupancyArrowsVisibilityReporterProps) {
  const ctx = useOccupancyArrowsRegister();
  const taskIdsKey = taskIds.join(',');
  // Стабилизируем по содержимому: ссылка на taskIds с родителя может меняться без смены набора id.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- зависимость только от taskIdsKey
  const stableTaskIds = useMemo(() => taskIds.slice(), [taskIdsKey]);

  const registerVisible = ctx?.registerVisible;
  useEffect(() => {
    if (!registerVisible || stableTaskIds.length === 0) return;
    registerVisible(stableTaskIds, inView);
    return () => registerVisible(stableTaskIds, false);
  }, [inView, registerVisible, stableTaskIds]);

  return null;
}
