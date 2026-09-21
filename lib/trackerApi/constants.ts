/**
 * Константы для Tracker API (только серверная сторона).
 */

export const TRACKER_V3_BASE = 'https://api.tracker.yandex.net/v3';

/** Кэш TTL для workflow-данных (редко меняются) */
export const WORKFLOW_CACHE_TTL = 60 * 60; // 1 час

/** Concurrency для batch-запросов к Tracker */
export const TRANSITIONS_BATCH_CONCURRENCY = 10;
