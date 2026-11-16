import { describe, expect, it, vi } from 'vitest';

import { applySidebarResizeEnd } from './resizableSidebarResizeEnd';

describe('applySidebarResizeEnd', () => {
  const base = { closeThreshold: 50, minWidth: 260, wasOpenOnResizeStart: true };

  it('стянули до закрытия — сайдбар закрывается, а ширина возвращается к той, что была до жеста', () => {
    const onToggle = vi.fn();
    const onWidthChange = vi.fn();
    applySidebarResizeEnd({ ...base, finalWidth: 10, onToggle, onWidthChange, widthOnResizeStart: 340 });
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onWidthChange).toHaveBeenCalledWith(340);
  });

  it('обычное растягивание сохраняет новую ширину, не уже минимальной', () => {
    const onWidthChange = vi.fn();
    applySidebarResizeEnd({ ...base, finalWidth: 200, onToggle: vi.fn(), onWidthChange, widthOnResizeStart: 340 });
    expect(onWidthChange).toHaveBeenCalledWith(260);
  });
});
