/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AgentMessageText } from './AgentMessageText';

describe('AgentMessageText', () => {
  it('renders markdown emphasis, lists and inline code', () => {
    const { container } = render(
      <AgentMessageText surface="plain" text={'**Перегруз** у Пети\n\n- *сдвинуть* `RND-12`\n- отдать Маше'} />
    );
    expect(container.querySelector('strong')?.textContent).toBe('Перегруз');
    expect(container.querySelector('em')?.textContent).toBe('сдвинуть');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('code')?.textContent).toBe('RND-12');
    expect(container.textContent).not.toContain('**');
  });

  it('keeps bare urls clickable and line breaks inside a paragraph', () => {
    const { container } = render(<AgentMessageText text={'Смотри https://example.com/a\nвторая строка'} />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/a');
    expect(container.querySelector('p')?.textContent).toContain('\nвторая строка');
  });

  it('renders strikethrough, task lists and tables', () => {
    const { container } = render(
      <AgentMessageText text={'~~старое~~\n\n- [x] прочитать\n- [ ] проверить\n\n| a | b |\n|---|---|\n| 1 | 2 |'} />
    );
    expect(container.querySelector('del')?.textContent).toBe('старое');
    const boxes = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(boxes.map((box) => box.checked)).toEqual([true, false]);
    expect(boxes.every((box) => box.disabled)).toBe(true);
    expect(container.textContent).not.toContain('[x]');
    expect(container.querySelectorAll('td')).toHaveLength(2);
  });

  it('does not render raw html', () => {
    const { container } = render(<AgentMessageText text={'<img src=x onerror=alert(1)> текст'} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
