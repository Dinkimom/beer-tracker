import type { SearchableMultiSelectOption } from './SearchableMultiSelect';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { useState } from 'react';

import { SearchableMultiSelect } from './SearchableMultiSelect';

const TEAMS = ['Core', 'Payments', 'Mobile', 'Платформа', 'Очень длинное название команды, которое не влезает в строку'];

function Demo({ disabled = false, initial = [] as string[], loading = false, withNote = false }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const options: SearchableMultiSelectOption[] = TEAMS.map((title, index) => ({
    key: title,
    label: title,
    note: withNote && index === 0 ? 'из команд' : undefined,
    selected: selected.includes(title),
  }));
  return (
    <div className="w-80">
      <SearchableMultiSelect
        disabled={disabled}
        displayText={selected.length === 0 ? 'Не выбрано' : selected.join(', ')}
        loadingLabel={loading ? 'Ищем…' : undefined}
        options={options}
        placeholderShown={selected.length === 0}
        searchPlaceholder="Поиск команды"
        title="Команды"
        onToggle={(key) =>
          setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
        }
      />
    </div>
  );
}

const meta = {
  title: 'Components/SearchableMultiSelect',
  component: Demo,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ничего не выбрано: подсказка серым. Поиск фильтрует строки, выбор не закрывает список. */
export const Empty: Story = { args: {} };

export const WithSelection: Story = { args: { initial: ['Core', 'Payments'] } };

/** Закреплённая строка с пометкой справа (очереди «из команд»). */
export const WithNote: Story = { args: { initial: ['Core'], withNote: true } };

/** Данные догружаются: строка под списком. */
export const Loading: Story = { args: { loading: true } };

export const Disabled: Story = { args: { disabled: true, initial: ['Core'] } };
