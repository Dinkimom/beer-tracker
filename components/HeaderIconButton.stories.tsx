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
    children: <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" name="settings" />,
  },
};

export const ThemeSun: Story = {
  args: {
    title: 'Светлая тема',
    type: 'button',
    children: <Icon className="h-4 w-4 text-amber-500" name="sun" />,
  },
};
