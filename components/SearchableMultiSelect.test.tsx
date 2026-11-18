/** @vitest-environment jsdom */

import type { SearchableMultiSelectOption } from './SearchableMultiSelect';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchableMultiSelect } from './SearchableMultiSelect';

vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const TEAMS = [
  { key: 'core', label: 'Core' },
  { key: 'payments', label: 'Payments' },
  { key: 'mobile', label: 'Mobile' },
];

function LocalHarness({ onOpen }: { onOpen?: () => void }) {
  const [selected, setSelected] = useState<string[]>(['core']);
  const options: SearchableMultiSelectOption[] = TEAMS.map((team) => ({
    ...team,
    selected: selected.includes(team.key),
  }));
  return (
    <SearchableMultiSelect
      displayText={selected.join(', ') || 'Не выбрано'}
      options={options}
      placeholderShown={selected.length === 0}
      searchPlaceholder="Поиск"
      title="Команды"
      onOpen={onOpen}
      onToggle={(key) =>
        setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
      }
    />
  );
}

function open() {
  const trigger = screen.getAllByRole('button')[0]!;
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
  fireEvent.click(trigger);
}

describe('SearchableMultiSelect', () => {
  it('toggles options and keeps the list open', () => {
    const onOpen = vi.fn();
    render(<LocalHarness onOpen={onOpen} />);
    open();
    expect(onOpen).toHaveBeenCalledTimes(1);
    const payments = screen.getByRole('button', { name: 'Payments' });
    expect(payments.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(payments);
    expect(screen.getByRole('button', { name: 'Payments' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Core' }));
    expect(screen.getByRole('button', { name: 'Core' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('filters locally by label when no onQueryChange is given', () => {
    render(<LocalHarness />);
    open();
    fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'pay' } });
    expect(screen.queryByRole('button', { name: 'Core' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Payments' })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'zzz' } });
    expect(screen.getByText('common.userSelector.empty')).toBeTruthy();
  });

  it('hands the query to onQueryChange and shows options as given', () => {
    const onQueryChange = vi.fn();
    render(
      <SearchableMultiSelect
        displayText="—"
        idleEmptyLabel="Введите ключ очереди"
        loadingLabel="Ищем…"
        options={[{ key: 'CORE', label: 'CORE · Core', note: 'из команд', selected: true }]}
        placeholderShown
        searchPlaceholder="Поиск"
        title="Команды"
        onQueryChange={onQueryChange}
        onToggle={() => undefined}
      />
    );
    open();
    expect(onQueryChange).toHaveBeenLastCalledWith('');
    fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'xyz' } });
    expect(onQueryChange).toHaveBeenLastCalledWith('xyz');
    // Внешний поиск: строка не отфильтрована компонентом.
    expect(screen.getByRole('button', { name: /CORE · Core/ })).toBeTruthy();
    expect(screen.getByText('из команд')).toBeTruthy();
    expect(screen.getByText('Ищем…')).toBeTruthy();
  });

  it('shows the idle empty label without a query', () => {
    render(
      <SearchableMultiSelect
        displayText="—"
        idleEmptyLabel="Введите ключ очереди"
        options={[]}
        placeholderShown
        searchPlaceholder="Поиск"
        title="Команды"
        onQueryChange={() => undefined}
        onToggle={() => undefined}
      />
    );
    open();
    expect(screen.getByText('Введите ключ очереди')).toBeTruthy();
  });
});
