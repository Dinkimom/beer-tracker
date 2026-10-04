interface SidebarTaskGroupLabelProps {
  count: number;
  label: string;
}

/** Тихий разделитель группы: имя слева и линия, без плашки. */
export function SidebarTaskGroupLabel({ count, label }: SidebarTaskGroupLabelProps) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h3 className="min-w-0 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </h3>
      <span className="shrink-0 text-[11px] text-gray-400 tabular-nums dark:text-gray-500">
        {count}
      </span>
      <span aria-hidden className="h-px min-w-4 flex-1 bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
