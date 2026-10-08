import { describe, expect, it, vi } from 'vitest';

import { applyTextTooltipOpenChange, suppressTextTooltipFocusOpen } from './textTooltipOpenChange';

describe('textTooltipOpenChange', () => {
  it('updates group open id when opening and closing', () => {
    const setOpenId = vi.fn();
    const setOpen = vi.fn();
    const group = { openId: null as string | null, setOpenId };

    applyTextTooltipOpenChange({
      group,
      next: true,
      setOpen,
      singleInGroupId: 'a',
    });
    expect(setOpenId).toHaveBeenCalledWith('a');
    expect(setOpen).toHaveBeenCalledWith(true);

    group.openId = 'a';
    applyTextTooltipOpenChange({
      group,
      next: false,
      setOpen,
      singleInGroupId: 'a',
    });
    expect(setOpenId).toHaveBeenCalledWith(null);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('suppresses focus-open so tip does not stick until click', () => {
    const preventDefault = vi.fn();
    suppressTextTooltipFocusOpen({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
