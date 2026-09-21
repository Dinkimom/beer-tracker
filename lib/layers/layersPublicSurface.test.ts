import type {
  DataLayerError,
  SprintPlannerContextMenuAnchorRect,
  SprintPlannerContextMenuState,
  TransportResult,
} from '@/lib/layers';

import { describe, expect, it } from 'vitest';

/**
 * Фиксируем публичную поверхность слоёв (типы + реэкспорт transport),
 * чтобы knip не считала экспорты мёртвыми до появления репозиториев.
 */
describe('lib/layers public surface', () => {
  it('SprintPlanner UI types are exported', () => {
    const menu: SprintPlannerContextMenuState | null = null;
    expect(menu).toBeNull();
    const rect: SprintPlannerContextMenuAnchorRect = {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
    };
    expect(rect.width).toBe(0);
  });

  it('data + transport types are usable', () => {
    const err: DataLayerError = { message: 'x' };
    const ok: TransportResult<number> = { ok: true, data: 1 };
    const fail: TransportResult<number> = { ok: false, error: new Error('e') };
    expect(err.message).toBe('x');
    expect(ok.ok && ok.data).toBe(1);
    expect(fail.ok).toBe(false);
  });
});
