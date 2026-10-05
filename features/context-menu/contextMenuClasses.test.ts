import { describe, expect, it } from 'vitest';

import { glassLensControlClass } from './contextMenuClasses';

describe('glassLensControlClass', () => {
  it('recesses a light lens with a dark veil instead of a white fill', () => {
    const lens = glassLensControlClass();
    expect(lens).toContain('!bg-black/[0.03]');
    expect(lens).toContain('hover:!bg-black/[0.06]');
    expect(lens).not.toContain('!bg-white/90');
    expect(lens).not.toContain('!bg-blue-600/10');
  });

  it('keeps the dark lens denser than the glass bar', () => {
    expect(glassLensControlClass()).toContain('dark:!bg-black/25');
    expect(glassLensControlClass()).toContain('dark:data-[state=open]:!bg-gray-900');
  });

  it('tints a selected lens without the resting veil', () => {
    const selected = glassLensControlClass(true);
    expect(selected).toContain('!bg-blue-600/10');
    expect(selected).not.toContain('!bg-black/[0.03]');
  });
});
