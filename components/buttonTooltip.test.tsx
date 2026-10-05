/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';
import { HeaderIconButton } from './HeaderIconButton';

describe('button tooltips', () => {
  it('does not put Button title on the DOM node', () => {
    render(<Button title="Save changes">Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('title')).toBeNull();
  });

  it('uses HeaderIconButton title as the accessible name and not a native tooltip', () => {
    render(
      <HeaderIconButton title="Settings">
        <span aria-hidden>⚙</span>
      </HeaderIconButton>
    );
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button.getAttribute('title')).toBeNull();
  });

  it('keeps an explicit HeaderIconButton aria-label', () => {
    render(
      <HeaderIconButton aria-label="Close settings" title="Close">
        <span aria-hidden>×</span>
      </HeaderIconButton>
    );
    expect(screen.getByRole('button', { name: 'Close settings' })).toBeTruthy();
  });
});
