export function applyTextTooltipOpenChange(params: {
  group: { openId: string | null; setOpenId: (id: string | null) => void } | null;
  next: boolean;
  onOpenChange?: (open: boolean) => void;
  setOpen: (open: boolean) => void;
  singleInGroupId?: string;
}): void {
  if (params.singleInGroupId && params.group) {
    if (params.next) {
      params.group.setOpenId(params.singleInGroupId);
    } else if (params.group.openId === params.singleInGroupId) {
      params.group.setOpenId(null);
    }
  }
  params.onOpenChange?.(params.next);
  params.setOpen(params.next);
}
