import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { Script, createContext } from "node:vm";

const controller = (await readFile(new URL("../public/demo.js", import.meta.url), "utf8"))
  .replace(/\nexport \{\};\s*$/, "");

/** Antarmuka DOM untuk menjalankan controller demo asli, termasuk urutan unload iframe dan storage. */
function createDemo(source, confirmed) {
  const events = [];
  const parent = new EventTarget();
  const status = { textContent: "Memuat aplikasi…" };
  const saved = {
    "gea.onboarding.done.v1": "1",
    "gea.preferences.v2": "preferences",
    "gea.visit.v2:mock": "mock-session",
    "gea.progress.v2:mock:mock-session": "mock-progress",
    "gea.mock.server.v2": "mock-answers",
    "gea.visit.v2:api": "api-session",
    "gea.progress.v2:api:api-session": "api-progress",
    "sb-auth-token": "auth",
    "unrelated-setting": "keep",
  };
  let stopped = false;
  const storage = {
    ...saved,
    removeItem(key) {
      events.push({ action: "remove", key, stopped });
      delete storage[key];
    },
  };
  class DemoButton extends EventTarget {
    hidden = false;
    disabled = true;
  }
  class DemoFrame extends EventTarget {
    currentSource = "about:blank";
    contentWindow = { postMessage: () => announce(source, parent.location.origin) };
    get src() { return this.currentSource; }
    set src(value) {
      this.currentSource = value;
      events.push({ action: "navigate", url: value });
      queueMicrotask(() => {
        stopped = value === "about:blank";
        if (stopped) events.push({ action: "stopped" });
        this.dispatchEvent(new Event("load"));
      });
    }
  }
  const frame = new DemoFrame();
  const reset = new DemoButton();
  Object.assign(parent, {
    location: { origin: "http://localhost:8081" }, localStorage: storage,
    confirm: () => confirmed, setTimeout, clearTimeout,
  });
  function announce(mode, origin) {
    const message = new Event("message");
    Object.defineProperties(message, {
      origin: { value: origin }, source: { value: frame.contentWindow },
      data: { value: `gea:source:${mode}` },
    });
    parent.dispatchEvent(message);
  }
  new Script(controller, { filename: "public/demo.js" }).runInContext(createContext({
    window: parent, URL, Date, HTMLIFrameElement: DemoFrame, HTMLButtonElement: DemoButton,
    document: {
      querySelector: () => frame,
      getElementById: (id) => ({ "reset-demo": reset, "demo-status": status })[id],
    },
  }));
  return { frame, reset, status, storage, saved, events, announce };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("Ulangi demo tetap terlihat; hanya mode mock yang mengaktifkan reset", async () => {
  const demo = createDemo("api", true);
  await settle();
  assert.equal(demo.reset.hidden, false);
  assert.equal(demo.reset.disabled, true);
  assert.match(demo.status.textContent, /data backend/);
  demo.announce("mock", "https://another-origin.example");
  assert.equal(demo.reset.disabled, true);
});

test("reset demo menghentikan iframe dahulu, membersihkan progres mock, lalu memuat onboarding baru", async () => {
  const demo = createDemo("mock", true);
  await settle();
  assert.equal(demo.reset.disabled, false);
  demo.reset.dispatchEvent(new Event("click"));
  await settle();
  assert.equal(demo.storage["gea.onboarding.done.v1"], undefined);
  assert.equal(demo.storage["gea.preferences.v2"], undefined);
  assert.equal(demo.storage["gea.visit.v2:mock"], undefined);
  assert.equal(demo.storage["gea.mock.server.v2"], undefined);
  assert.equal(demo.storage["gea.visit.v2:api"], "api-session");
  assert.equal(demo.storage["gea.progress.v2:api:api-session"], "api-progress");
  assert.equal(demo.storage["sb-auth-token"], "auth");
  assert.equal(demo.storage["unrelated-setting"], "keep");
  const deletions = demo.events.filter((event) => event.action === "remove");
  assert.ok(deletions.length > 0);
  assert.ok(deletions.every((event) => event.stopped), "Aplikasi lama harus berhenti sebelum progres dibersihkan");
  assert.equal(new URL(demo.frame.src).pathname, "/");
  assert.ok(new URL(demo.frame.src).searchParams.has("preview"));
  assert.equal(demo.reset.disabled, false, "Tombol reset tersedia lagi setelah aplikasi baru mengirim mode mock");
});

test("membatalkan reset mempertahankan sesi dan halaman demo", async () => {
  const demo = createDemo("mock", false);
  await settle();
  const originalPage = demo.frame.src;
  demo.reset.dispatchEvent(new Event("click"));
  await settle();
  assert.equal(demo.frame.src, originalPage);
  assert.equal(demo.storage["gea.onboarding.done.v1"], "1");
  assert.equal(demo.storage["gea.visit.v2:mock"], "mock-session");
  assert.equal(demo.events.some((event) => event.action === "remove"), false);
  assert.equal(demo.reset.disabled, false);
});
