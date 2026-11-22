import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { useState } from 'react';

import { CustomSelect, type CustomSelectOption } from './CustomSelect';

const TRACKERS: CustomSelectOption<string>[] = [
  { label: 'Яндекс Трекер', value: 'tracker' },
  { label: 'Jira Cloud', value: 'jira-cloud' },
  { label: 'Jira Server / Data Center', value: 'jira-onprem', disabled: true },
  { label: 'Встроенный трекер с очень длинным названием, которое не влезает в строку', value: 'otorva' },
];

/** Список — `listbox`, варианты — `option` с `aria-selected`: скринридер слышит выбранный пункт. */
function Demo({
  disabled = false,
  initial = 'tracker',
  searchable = false,
  surface = 'solid' as const,
}: {
  disabled?: boolean;
  initial?: string;
  searchable?: boolean;
  surface?: 'glass' | 'solid';
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="w-72">
      <CustomSelect
        disabled={disabled}
        options={TRACKERS}
        searchable={searchable}
        surface={surface}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

const meta = {
  title: 'Components/CustomSelect',
  component: Demo,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Длинная подпись выбранного варианта обрезается в триггере. */
export const LongValue: Story = { args: { initial: 'otorva' } };

/** Поиск по вариантам; пустой результат — «Ничего не найдено» на языке интерфейса. */
export const Searchable: Story = { args: { searchable: true } };

/** Стеклянная плашка: триггер — линза, меню — строки меню задачи. */
export const Glass: Story = { args: { surface: 'glass' } };

export const Disabled: Story = { args: { disabled: true } };
