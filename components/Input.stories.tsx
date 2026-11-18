import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Input } from './Input';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Введите текст', 'aria-label': 'Пример поля' },
};

export const Invalid: Story = {
  args: {
    placeholder: 'С ошибкой',
    'aria-label': 'Поле с ошибкой',
    invalid: true,
    defaultValue: 'некорректно',
  },
};

/** Компактное поле: поповер, строка списка, поиск в выпадающем списке. Высота как у компактного селекта. */
export const Small: Story = {
  args: { placeholder: 'Поиск…', 'aria-label': 'Компактное поле', size: 'sm' },
};

export const Disabled: Story = {
  args: { 'aria-label': 'Выключенное поле', defaultValue: 'Нельзя изменить', disabled: true },
};

export const NumberField: Story = {
  args: { 'aria-label': 'Число', min: 0, placeholder: '0', type: 'number' },
};
