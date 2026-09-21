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
