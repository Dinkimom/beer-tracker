/** Оверлей снят — стрелки должны пересчитаться по живому layout доски. */
export const PLANNER_LOADING_OVERLAY_HIDDEN_EVENT = 'beer-tracker:planner-loading-overlay-hidden';

export function notifyPlannerLoadingOverlayHidden(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(PLANNER_LOADING_OVERLAY_HIDDEN_EVENT));
}
