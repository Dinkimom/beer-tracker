import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: { onClose: () => {}, title: 'Заголовок окна' },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

const actions = (
  <>
    <Button variant="outline">Отмена</Button>
    <Button>Сохранить</Button>
  </>
);

export const Default: Story = {
  args: { children: <p className="text-sm text-gray-700 dark:text-gray-300">Содержимое окна без пояснения и кнопок.</p> },
};

export const WithDescriptionAndFooter: Story = {
  args: {
    children: <Input aria-label="Название" defaultValue="Спринт 16" />,
    description: 'Пояснение под заголовком: что произойдёт после сохранения.',
    footer: actions,
  },
};

/** Содержимое выше окна: прокручивается оно, заголовок и кнопки стоят на месте. */
export const LongContent: Story = {
  args: {
    children: Array.from({ length: 30 }, (_, index) => (
      <p key={index} className="text-sm text-gray-700 dark:text-gray-300">
        Строка {index + 1}
      </p>
    )),
    description: 'Окно не выше 90% экрана.',
    footer: actions,
  },
};

export const Wide: Story = {
  args: {
    children: <p className="text-sm text-gray-700 dark:text-gray-300">Ширина задаётся классом: `max-w-2xl`.</p>,
    className: 'max-w-2xl',
    footer: actions,
  },
};

/** Форма с вводом: клик по затемнению окно не закрывает, Escape и «Отмена» — закрывают. */
export const FormKeepsOpenOnBackdropClick: Story = {
  args: {
    children: <Input aria-label="Комментарий" placeholder="Кликните мимо окна — оно останется" />,
    closeOnBackdrop: false,
    footer: actions,
  },
};

export const DangerAction: Story = {
  args: {
    children: <p className="text-sm text-gray-700 dark:text-gray-300">Незавершённые задачи уйдут в следующий спринт.</p>,
    footer: (
      <>
        <Button variant="outline">Отмена</Button>
        <Button variant="danger">Завершить спринт</Button>
      </>
    ),
    title: 'Завершить спринт',
  },
};

/** Идёт операция (`busy`): Escape и клик мимо окно не закрывают, кнопки выключает само окно-потребитель. */
export const Busy: Story = {
  args: {
    busy: true,
    children: <p className="text-sm text-gray-700 dark:text-gray-300">Сохраняем…</p>,
    footer: (
      <>
        <Button disabled variant="outline">
          Отмена
        </Button>
        <Button disabled>Сохраняем…</Button>
      </>
    ),
  },
};

/** Своя раскладка (`bare`): окно с вкладками или сменными экранами само рисует шапку и прокрутку. */
export const BareWithOwnLayout: Story = {
  args: {
    bare: true,
    children: (
      <>
        <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Настройки</h2>
          <Button variant="ghost">Закрыть</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
          Вкладки и их содержимое.
        </div>
      </>
    ),
    className: 'max-w-2xl',
    title: 'Настройки',
  },
};
