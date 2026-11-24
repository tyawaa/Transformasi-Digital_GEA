/// <reference types="node" />
// @ts-check
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Build demo selalu memakai mock dan direktori sendiri, terpisah dari build API di dist/web. */
const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(process.execPath, [
  "node_modules/expo/bin/cli", "export", "--platform", "web",
  "--output-dir", "dist/demo", "--max-workers", "2",
], {
  cwd: frontendRoot,
  env: { ...process.env, EXPO_PUBLIC_STORIES_SOURCE: "mock" },
  stdio: "inherit",
});
if (result.error !== undefined) throw result.error;
if (result.status !== 0) {
  throw new Error(`Build demo gagal: exitCode=${result.status}, signal=${result.signal}. Periksa keluaran Expo di atas.`);
}
