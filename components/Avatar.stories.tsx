import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Avatar } from './Avatar';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { initials: 'AK', size: 'lg', title: 'Anastasia Konstantinovna' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Фото профиля. */
export const Photo: Story = {
  args: { avatarUrl: '/demo/avatars/linus.jpg', initials: 'LT', title: 'Linus Torvalds' },
};

/** Без фото — серые инициалы (человек без команды и роли). */
export const InitialsDefault: Story = {};

/**
 * Цвета команд: тот же вариант у человека в колонке «Команда», в фильтре по исполнителю и на карточке
 * (`getAvatarVariantForDeveloper`). Белые инициалы проходят AA.
 */
export const InitialsByTeam: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Avatar {...args} initials="BK" initialsVariant="back" title="Back" />
      <Avatar {...args} initials="WB" initialsVariant="web" title="Web" />
      <Avatar {...args} initials="QA" initialsVariant="qa" title="QA" />
      <Avatar {...args} initials="DO" initialsVariant="devops" title="DevOps" />
      <Avatar {...args} initials="PR" initialsVariant="primary" title="Primary" />
    </div>
  ),
};

/** Все размеры: от подвала карточки «по фичам» (2xs) до заголовка строки (lg). */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      {(['2xs', 'xs', 'sm', 'md', 'lg'] as const).map((size) => (
        <Avatar key={size} {...args} initialsVariant="back" size={size} />
      ))}
    </div>
  ),
};

/** Фото не загрузилось бы — пустой URL даёт инициалы, а не битую картинку. */
export const EmptyPhotoUrl: Story = {
  args: { avatarUrl: '', initialsVariant: 'web' },
};
