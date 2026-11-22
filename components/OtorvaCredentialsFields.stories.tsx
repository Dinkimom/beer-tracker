import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OtorvaCredentialsFields } from './OtorvaCredentialsFields';

const meta = {
  title: 'Components/OtorvaCredentialsFields',
  component: OtorvaCredentialsFields,
  tags: ['autodocs'],
  args: { idPrefix: 'story' },
  decorators: [(Story) => <form className="max-w-sm"><Story /></form>],
} satisfies Meta<typeof OtorvaCredentialsFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Вход: email и пароль встроенного трекера. */
export const SignIn: Story = {};

/** Онбординг: ещё имя первого администратора и подсказка к паролю. */
export const Onboarding: Story = { args: { withName: true } };

/** Пока идёт запрос — поля недоступны. */
export const Disabled: Story = { args: { disabled: true, withName: true } };
