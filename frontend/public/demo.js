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
let resetting = false;

/** @param {MessageEvent<unknown>} event @returns {void} */
function onSource(event) {
  if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
  if (event.data !== "gea:source:mock" && event.data !== "gea:source:api") return;
  mockReady = event.data === "gea:source:mock";
  if (resetting) return;
  reset.disabled = !mockReady;
  status.textContent = mockReady
    ? "Refresh melanjutkan progres. Ulangi demo untuk mulai dari awal."
    : "Halaman ini memakai data backend. Untuk demo dari awal, jalankan npm run demo lalu buka /demo.html.";
}

/** Hentikan aplikasi sebelum penyimpanan direset agar efek penyimpanan lama tidak menulis kembali progres. @returns {Promise<void>} */
function stopPreview() {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      frame.removeEventListener("load", onStopped);
      reject(new Error("Aplikasi demo belum berhenti setelah 10 detik. Muat ulang halaman lalu coba lagi."));
    }, 10000);
    function onStopped() {
      window.clearTimeout(timeout);
      resolve();
    }
    frame.addEventListener("load", onStopped, { once: true });
    frame.src = "about:blank";
  });
}

/** Menghapus progres demo lokal lalu memulai onboarding baru. @returns {Promise<void>} */
async function resetDemo() {
  if (resetting) return;
  if (!mockReady) throw new Error("Reset demo hanya tersedia saat sumber Stories memakai mock.");
  const confirmed = window.confirm(
    "Ulangi demo dari awal? Progres, poin, kuis, dan onboarding di browser ini akan direset. Konten cerita dan data Supabase tetap tersimpan.",
  );
  if (!confirmed) return;
  resetting = true;
  reset.disabled = true;
  status.textContent = "Memulai ulang demo…";
  try {
    await stopPreview();
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith("gea.") && key !== "gea.visit.v2:api" && !key.startsWith("gea.progress.v2:api:")
    );
    for (const key of keys) window.localStorage.removeItem(key);
    loadPreview();
  } catch (cause) {
    resetting = false;
    reset.disabled = false;
    status.textContent = "Reset gagal. Izinkan penyimpanan browser, lalu coba lagi.";
    throw cause;
  }
}

window.addEventListener("message", onSource);
frame.addEventListener("load", () => {
  if (resetting) return;
  mockReady = false;
  reset.disabled = true;
  frame.contentWindow?.postMessage("gea:request-source", window.location.origin);
});
reset.addEventListener("click", () => { void resetDemo(); });

// Preview statis: muat dokumen aplikasi baru setiap halaman demo dibuka, tanpa menghapus progres.
function loadPreview() {
  mockReady = false;
  resetting = false;
  reset.disabled = true;
  const previewUrl = new URL("/", window.location.origin);
  previewUrl.searchParams.set("preview", String(Date.now()));
  frame.src = previewUrl.href;
}
loadPreview();

export {};
