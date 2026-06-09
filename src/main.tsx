import { createRoot } from "react-dom/client";
import { Suspense } from "react";
import App from "./App.tsx";
import LoadingScreen from "./components/LoadingScreen.tsx";
import "./index.css";
import "./lib/i18n";

// Recover from stale chunk errors caused by an outdated service worker / cached HTML
// pointing to JS chunks that no longer exist after a deploy. Without this, lazy route
// imports throw and React renders nothing -> white screen.
const RELOAD_FLAG = "__chunk_reload_attempted__";

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    (err as any)?.message ??
    (err as any)?.reason?.message ??
    String(err);
  return /Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    msg
  );
}

async function recoverFromStaleChunks() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(RELOAD_FLAG)) return; // avoid infinite reload loops
  sessionStorage.setItem(RELOAD_FLAG, "1");
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }
  window.location.reload();
}

window.addEventListener("error", (event) => {
  if (isChunkLoadError(event.error || event.message)) {
    void recoverFromStaleChunks();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) {
    void recoverFromStaleChunks();
  }
});

// Clear the flag once the app successfully mounts a route afterwards
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);
});

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<LoadingScreen />}>
    <App />
  </Suspense>
);
