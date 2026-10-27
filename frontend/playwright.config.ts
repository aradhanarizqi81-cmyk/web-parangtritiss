import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Konfigurasi QA browser untuk frontend Next.js.
 *
 * Artefak (screenshot, trace, storage state) ditulis ke direktori sementara,
 * BUKAN ke dalam repositori, supaya cookie sesi hasil login tidak pernah ikut
 * ter-commit. Password akun uji hanya dibaca dari env QA_PASSWORD.
 */
const artifactsDir =
  process.env.QA_ARTIFACTS_DIR ?? path.join(os.tmpdir(), "parangtritis-qa");

const baseURL = process.env.QA_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  outputDir: path.join(artifactsDir, "traces"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  globalSetup: "./e2e/global-setup.ts",
  reporter: [
    ["list"],
    ["json", { outputFile: path.join(artifactsDir, "results.json") }],
    ["html", { outputFolder: path.join(artifactsDir, "html"), open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 90_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
