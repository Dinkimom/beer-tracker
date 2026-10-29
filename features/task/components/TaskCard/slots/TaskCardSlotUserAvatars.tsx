'use client';

import type { Developer, TaskCustomFieldUser } from '@/types';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { TextTooltip } from '@/components/TextTooltip';
import { getInitials } from '@/utils/displayUtils';

/** Больше трёх аватаров на узкой карточке не читается — остаток числом. */
const MAX_AVATARS = 3;

interface TaskCardSlotUserAvatarsProps {
  developers: readonly Developer[];
  fieldId: string;
  title: string;
  users: readonly TaskCustomFieldUser[];
}

/** Пользователи из поля трекера стопкой аватаров. Фото — у сотрудника с тем же id, иначе инициалы. */
export function TaskCardSlotUserAvatars({ developers, fieldId, title, users }: TaskCardSlotUserAvatarsProps) {
  const shown = users.slice(0, MAX_AVATARS);
  const rest = users.length - shown.length;
  return (
    <TextTooltip content={title}>
      <span className="inline-flex shrink-0 items-center" data-task-card-field={fieldId}>
        <span className="flex -space-x-1.5">
          {shown.map((user) => {
            const developer = developers.find((item) => item.id === user.id);
            return (
              <Avatar
                key={user.id}
                avatarUrl={developer?.avatarUrl}
                initials={getInitials(developer?.name ?? user.name)}
                initialsVariant={developer ? getAvatarVariantForDeveloper(developer) : 'default'}
                size="xs"
              />
            );
          })}
        </span>
        {rest > 0 ? (
          <span className="ml-1 text-[10px] font-medium leading-none text-gray-600 dark:text-gray-300">+{rest}</span>
        ) : null}
      </span>
    </TextTooltip>
  );
}
