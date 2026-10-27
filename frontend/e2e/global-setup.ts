import fs from "node:fs";
import { request } from "@playwright/test";
import {
  ARTIFACTS_DIR,
  AUTH_DIR,
  BASE_URL,
  MATRIX_DIR,
  ROLES,
  ROLE_EMAILS,
  SHOTS_DIR,
  authStatePath,
  qaPassword,
} from "./env";

/**
 * Menyiapkan artefak dan satu storage state per role dengan login lewat BFF
 * (endpoint sama-origin). Cookie sesi HttpOnly yang dihasilkan disimpan di
 * direktori sementara, tidak pernah di dalam repositori.
 */
export default async function globalSetup(): Promise<void> {
  for (const dir of [ARTIFACTS_DIR, AUTH_DIR, SHOTS_DIR, MATRIX_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const password = qaPassword();

  for (const role of ROLES) {
    const context = await request.newContext({ baseURL: BASE_URL });

    try {
      const response = await context.post("/api/auth/login", {
        data: { email: ROLE_EMAILS[role], password },
      });

      if (!response.ok()) {
        throw new Error(
          `Login QA gagal untuk role ${role} (${ROLE_EMAILS[role]}): ` +
            `HTTP ${response.status()} ${await response.text()}`,
        );
      }

      await context.storageState({ path: authStatePath(role) });
    } finally {
      await context.dispose();
    }
  }
}
