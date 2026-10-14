import { useEffect } from "react";

/** Тихий опрос: серверный TTL каталога 30 мин — чаще ходим только за cache hit. */
const TRACKER_METADATA_POLL_MS = 15 * 60 * 1000;

export function useTrackerMetadataPolling(
  organizationId: string,
  loadMetadata: (opts?: { refresh?: boolean; silent?: boolean }) => Promise<void>
): void {
  useEffect(() => {
    if (!organizationId) return;
    void loadMetadata({ silent: true });
  }, [organizationId, loadMetadata]);

  useEffect(() => {
    if (!organizationId) return;
    const timer = window.setInterval(() => {
      void loadMetadata({ silent: true });
    }, TRACKER_METADATA_POLL_MS);
    return () => window.clearInterval(timer);
  }, [organizationId, loadMetadata]);
}
