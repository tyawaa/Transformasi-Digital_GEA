// @ts-check

/** @typedef {{ frame: HTMLIFrameElement, reset: HTMLButtonElement, status: HTMLElement }} DemoElements */

/** @returns {DemoElements} */
function getDemoElements() {
  const frame = document.querySelector("iframe");
  const reset = document.getElementById("reset-demo");
  const status = document.getElementById("demo-status");
  if (!(frame instanceof HTMLIFrameElement) || !(reset instanceof HTMLButtonElement) || status === null) {
    throw new Error("Bingkai, tombol reset, atau status demo GEA tidak ditemukan.");
  }
  return { frame, reset, status };
}

const { frame, reset, status } = getDemoElements();
let mockReady = false;

/** @param {MessageEvent<unknown>} event @returns {void} */
function onSource(event) {
  if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
  if (event.data !== "gea:source:mock" && event.data !== "gea:source:api") return;
  mockReady = event.data === "gea:source:mock";
  reset.hidden = !mockReady;
  reset.disabled = !mockReady;
  status.textContent = mockReady
    ? "Refresh melanjutkan progres. Ulangi demo untuk mulai dari awal."
    : "Aplikasi memakai data backend.";
}

/** Menghapus progres demo lokal lalu memuat ulang aplikasi dengan konten terbaru. @returns {void} */
function resetDemo() {
  if (!mockReady) throw new Error("Reset demo hanya tersedia saat sumber Stories memakai mock.");
  const confirmed = window.confirm(
    "Ulangi demo dari awal? Progres, poin, kuis, dan onboarding di browser ini akan direset. Konten cerita dan data Supabase tetap tersimpan.",
  );
  if (!confirmed) return;
  reset.disabled = true;
  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith("gea."));
    for (const key of keys) window.localStorage.removeItem(key);
    window.location.reload();
  } catch (cause) {
    reset.disabled = false;
    status.textContent = "Reset gagal. Izinkan penyimpanan browser, lalu coba lagi.";
    throw cause;
  }
}

window.addEventListener("message", onSource);
frame.addEventListener("load", () => {
  mockReady = false;
  reset.hidden = true;
  reset.disabled = true;
  frame.contentWindow?.postMessage("gea:request-source", window.location.origin);
});
reset.addEventListener("click", resetDemo);
frame.contentWindow?.postMessage("gea:request-source", window.location.origin);

export {};
