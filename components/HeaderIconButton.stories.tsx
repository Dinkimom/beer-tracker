import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { HeaderIconButton } from './HeaderIconButton';
import { Icon } from './Icon';

const meta = {
  title: 'Components/HeaderIconButton',
  component: HeaderIconButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof HeaderIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Settings: Story = {
  args: {
    title: 'Настройки',
    type: 'button',
    children: <Icon className="h-4 w-4" name="settings" />,
  },
};

export const ThemeSun: Story = {
  args: {
    title: 'Светлая тема',
    type: 'button',
    children: <Icon className="h-4 w-4 text-amber-500" name="sun" />,
  },
};

/** На полупрозрачной поверхности (холст, стекло колонки): hover — вуаль, а не серая плашка. */
export const OnCanvas: Story = {
  args: {
    onCanvas: true,
    title: 'Меню колонки',
    type: 'button',
    children: <Icon className="h-4 w-4" name="dots-horizontal" />,
  },
};

/** Компактная — внутри карточки или заголовка колонки. */
export const Small: Story = {
  args: {
    onCanvas: true,
    size: 'sm',
    title: 'Удалить заметку',
    type: 'button',
    children: <Icon className="h-3.5 w-3.5" name="x" />,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    title: 'Недоступно',
    type: 'button',
    children: <Icon className="h-4 w-4" name="settings" />,
  },
};
