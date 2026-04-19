"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Silently refreshes the current route when the tab regains focus/visibility,
 * and on a polling interval while the tab is visible. Mount on server-rendered
 * pages so the user sees fresh data without a manual reload.
 */
export function PageRefresher({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (Date.now() - lastRefresh < 2000) return; // debounce
      lastRefresh = Date.now();
      router.refresh();
    };
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const id = window.setInterval(() => {
      if (!document.hidden) refresh();
    }, intervalMs);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(id);
    };
  }, [router, intervalMs]);
  return null;
}
