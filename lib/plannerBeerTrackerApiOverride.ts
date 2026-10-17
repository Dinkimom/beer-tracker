import type { AxiosInstance } from 'axios';

import { beerTrackerApi } from '@/lib/axios';

/**
 * Опциональная подмена HTTP-клиента для вызовов планера к `/api/*` (например страница `/demo/planner`).
 * Устанавливается только на время монтирования демо-страницы; в остальном приложении всегда {@link beerTrackerApi}.
 */
let plannerBeerTrackerApiOverride: AxiosInstance | null = null;

export function setPlannerBeerTrackerApiOverride(client: AxiosInstance | null): void {
  plannerBeerTrackerApiOverride = client;
}

export function getPlannerBeerTrackerApi(): AxiosInstance {
  return plannerBeerTrackerApiOverride ?? beerTrackerApi;
}
