'use client';

import type { TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentType } from 'react';

import { useState } from 'react';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { defaultTaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';

import { TaskCardDisplaySettingsPanel } from './TaskCardDisplaySettingsPanel';
import { taskCardSlotSampleInProgress } from './taskCardSlotFixtures';
import { TaskCardSlotPreview } from './TaskCardSlotPreview';

function withLanguage(Story: ComponentType) {
  return (
    <LanguageProvider>
      <div className="min-h-[640px] bg-gray-100 p-6 text-gray-900">
        <Story />
      </div>
    </LanguageProvider>
  );
}

const meta = {
  title: 'Planner/Task card slots',
  component: TaskCardSlotPreview,
  decorators: [withLanguage],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Окно отображения карточки свимлейна: сверху широкая карточка, где поля перетаскиваются по рядам. То же окно открывается из шапки планера и из настроек.',
      },
    },
  },
} satisfies Meta<typeof TaskCardSlotPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Classic: Story = {
  args: {
    density: 'regular',
    layout: defaultTaskCardSlotLayout(),
    task: taskCardSlotSampleInProgress,
  },
};

function TaskCardSlotsPlayground() {
  const [layout, setLayout] = useState<TaskCardSlotLayout>(defaultTaskCardSlotLayout());
  return (
    <TaskCardDisplaySettingsPanel
      fields={[
        {
          id: 'customfield_10046',
          key: 'customfield_10046',
          name: 'Need QA test',
          options: ['Yes', 'No', 'Needs clarification from the product owner'],
          schemaType: 'option',
        },
        { id: 'customer', name: 'Customer' },
      ]}
      fieldsStatus="ready"
      layout={layout}
      onChange={setLayout}
    />
  );
}

export const Playground: Story = {
  args: {
    layout: defaultTaskCardSlotLayout(),
    task: taskCardSlotSampleInProgress,
  },
  render: () => <TaskCardSlotsPlayground />,
};
