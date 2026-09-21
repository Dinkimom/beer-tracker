import { useEffect } from "react";

export function useTrackerMetadataPolling(
  organizationId: string,
  loadMetadata: (opts?: { silent?: boolean }) => Promise<void>
): void {
  useEffect(() => {
    if (!organizationId) return;
    void loadMetadata({ silent: true });
  }, [organizationId, loadMetadata]);

  useEffect(() => {
    if (!organizationId) return;
    const timer = window.setInterval(() => {
      void loadMetadata({ silent: true });
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [organizationId, loadMetadata]);
}
