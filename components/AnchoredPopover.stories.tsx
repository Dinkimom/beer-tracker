import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AnchoredPopover } from './AnchoredPopover';
import { Button } from './Button';
import { Input } from './Input';

const meta = {
  title: 'Components/AnchoredPopover',
  component: AnchoredPopover,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: { anchor: { x: 120, y: 80 }, className: 'p-3', onDismiss: () => {} },
} satisfies Meta<typeof AnchoredPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Меню у точки клика. */
export const AtPoint: Story = {
  args: {
    children: (
      <ul className="space-y-1 text-sm text-gray-800 dark:text-gray-100">
        <li>Сменить исполнителя</li>
        <li>Добавить ещё одного человека</li>
        <li>Убрать назначение</li>
      </ul>
    ),
    className: 'min-w-[220px] p-3',
  },
};

/** Якорь — прямоугольник элемента: панель встаёт под ним и выравнивается по центру. */
export const AtElementRectCentered: Story = {
  args: {
    align: 'center',
    anchor: { height: 32, width: 120, x: 300, y: 80 },
    children: <p className="text-sm text-gray-800 dark:text-gray-100">Под элементом 120×32, по центру.</p>,
  },
};

/** Панель с формой: своя раскладка и ширина задаются через `className`. */
export const PanelWithForm: Story = {
  args: {
    children: (
      <>
        <div className="flex items-center gap-2 border-b border-gray-200 p-4 dark:border-gray-700">
          <Input aria-label="Название" placeholder="Название строки" />
          <Button>Добавить</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm text-gray-800 dark:text-gray-100">Список строк</div>
      </>
    ),
    className: 'flex max-h-[70vh] w-[380px] flex-col overflow-hidden',
    sideOffset: 0,
  },
};

/** У нижнего края экрана панель уходит вверх. */
export const FlipsNearBottomEdge: Story = {
  args: {
    anchor: { x: 120, y: 2000 },
    children: <p className="text-sm text-gray-800 dark:text-gray-100">Не помещается снизу — открывается вверх.</p>,
  },
};
