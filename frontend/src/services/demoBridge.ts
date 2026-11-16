import type { StoriesSource } from "./stories";

/** Memberi tahu bingkai web apakah aplikasi memakai mock; tidak membuka akses data aplikasi. */
export function registerDemoSource(source: StoriesSource["kind"]): () => void {
  function announce(): void {
    window.parent.postMessage(`gea:source:${source}`, window.location.origin);
  }
  function onMessage(event: MessageEvent<unknown>): void {
    if (
      event.origin === window.location.origin && event.source === window.parent &&
      event.data === "gea:request-source"
    ) announce();
  }
  window.addEventListener("message", onMessage);
  announce();
  return (): void => window.removeEventListener("message", onMessage);
}
