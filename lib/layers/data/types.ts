/**
 * Слой данных — репозитории и маппинг DTO → домен поверх `lib/layers/transport`.
 * Реализации размещаем в `lib/layers/data/repositories/` (без React/MobX).
 */

export interface DataLayerError {
  cause?: unknown;
  message: string;
}
