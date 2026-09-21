'use client';

import { useProductAnalytics } from '@/hooks/useProductAnalytics';

/** Фоновый сбор продуктовой аналитики (настройки, просмотры маршрутов). */
export function AnalyticsCollector() {
  useProductAnalytics();
  return null;
}
