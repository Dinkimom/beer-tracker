/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotificationsUnreadBadge } from './NotificationsUnreadBadge';

describe('NotificationsUnreadBadge', () => {
  it('renders nothing when count is zero', () => {
    const { container } = render(<NotificationsUnreadBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows exact count up to nine', () => {
    render(<NotificationsUnreadBadge count={3} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('caps display at 9+', () => {
    render(<NotificationsUnreadBadge count={12} />);
    expect(screen.getByText('9+')).toBeTruthy();
  });
});
