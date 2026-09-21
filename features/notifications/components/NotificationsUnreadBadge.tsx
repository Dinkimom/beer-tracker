interface NotificationsUnreadBadgeProps {
  count: number;
}

export function NotificationsUnreadBadge({ count }: NotificationsUnreadBadgeProps) {
  if (count <= 0) {
    return null;
  }
  const label = count > 9 ? '9+' : String(count);
  return (
    <span
      aria-hidden
      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
    >
      {label}
    </span>
  );
}
