import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: 'Primary', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Secondary', variant: 'secondary' },
};

export const Danger: Story = {
  args: { children: 'Удалить', variant: 'danger' },
};

export const DangerOutline: Story = {
  args: { children: 'Удалить', variant: 'dangerOutline' },
};

export const Ghost: Story = {
  args: { children: 'Ghost', variant: 'ghost' },
};

export const Outline: Story = {
  args: { children: 'Outline', variant: 'outline' },
};

export const Accent: Story = {
  args: { children: 'Accent', variant: 'accent' },
};

export const Warning: Story = {
  args: { children: 'Warning', variant: 'warning' },
};
