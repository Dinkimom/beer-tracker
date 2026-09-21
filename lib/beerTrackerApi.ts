/**
 * API функции для работы с нашими Next.js API routes
 * Эти функции вызывают наши серверные API endpoints, которые в свою очередь обращаются к Tracker API
 *
 * ⚠️ ВНИМАНИЕ: Этот файл используется ТОЛЬКО на клиентской стороне
 * Для серверной стороны (API routes) используйте функции из trackerApi.ts
 *
 * Реализация разнесена по модулям в lib/api/ (issues, stories, quarterly, boards, sprints и др.).
 */

export * from './api';
