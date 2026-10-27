import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { MATRIX_DIR, SHOTS_DIR } from "./env";

/**
 * Helper QA bersama: pengumpulan diagnostik konsol/jaringan, pengukuran
 * overflow horizontal, pembuatan screenshot, dan penulisan matriks hasil.
 */

export type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
};

export type OverflowSample = {
  viewport: string;
  scrollWidth: number;
  clientWidth: number;
  overflowPx: number;
  offenders: string[];
};

function sanitize(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

export function collectDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = sanitize(message.text());
      // Noise dari dev overlay/HMR tidak dihitung sebagai error halaman.
      if (text && !/favicon\.ico/i.test(text)) {
        diagnostics.consoleErrors.push(text);
      }
    }
  });

  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push(sanitize(error.message));
  });

  page.on("requestfailed", (request) => {
    const type = request.resourceType();
    if (type === "document" || type === "xhr" || type === "fetch") {
      const failure = request.failure();
      const errorText = failure?.errorText ?? "";
      const url = request.url();
      // Next.js App Router prefetch/RSC requests are often cancelled by
      // subsequent navigations; treat aborted/cancelled prefetches as
      // expected noise rather than real failures.
      if (/abort|cancel|ERR_ABORTED/i.test(errorText)) {
        return;
      }
      if (/_rsc=/i.test(url)) {
        if (/abort|cancel|ERR_ABORTED/i.test(errorText) || errorText === "") {
          return;
        }
      }
      // Also catch net::ERR_ABORTED in full form
      if (/net::ERR_ABORTED/i.test(errorText)) {
        return;
      }
      diagnostics.failedRequests.push(
        `${request.method()} ${sanitize(url)} — ${errorText || "failed"}`,
      );
    }
  });

  page.on("response", (response) => {
    if (response.status() >= 500) {
      diagnostics.failedRequests.push(
        `HTTP ${response.status()} ${response.request().method()} ${sanitize(response.url())}`,
      );
    }
  });

  return diagnostics;
}

export async function measureOverflow(page: Page): Promise<OverflowSample> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const clientWidth = doc.clientWidth;
    const scrollWidth = doc.scrollWidth;
    const offenders: string[] = [];

    if (scrollWidth > clientWidth + 1) {
      for (const element of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right > clientWidth + 1) {
          const id = element.id ? `#${element.id}` : "";
          const classNames =
            typeof element.className === "string" && element.className
              ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
              : "";
          offenders.push(
            `${element.tagName.toLowerCase()}${id}${classNames} right=${Math.round(rect.right)}`,
          );
        }
        if (offenders.length >= 6) break;
      }
    }

    return { clientWidth, scrollWidth, overflowPx: scrollWidth - clientWidth, offenders };
  }).then((sample) => ({ ...sample, viewport: "" }));
}

/**
 * Path tangkapan layar QA. Pemanggilnya menyertakan `caret: "initial"` agar
 * Playwright tidak menyuntik `caret-color: transparent` ke elemen berfokus;
 * suntikan itu memicu peringatan hydration palsu saat halaman sedang hydrate.
 */
export function screenshotPath(
  group: string,
  name: string,
  viewport: string,
  suffix: string,
): string {
  const dir = path.join(SHOTS_DIR, group);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${name}__${viewport}__${suffix}.png`);
}

export type MatrixRow = {
  group: string;
  page: string;
  path: string;
  viewport: string;
  overflowPx: number;
  offenders: string[];
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  status: "PASS" | "FAIL" | "BLOCKED";
  note?: string;
};

/** Menulis satu baris matriks per halaman x viewport ke disk (JSON Lines). */
export function recordMatrixRows(group: string, rows: MatrixRow[]): string {
  fs.mkdirSync(MATRIX_DIR, { recursive: true });
  const safe = group.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const file = path.join(MATRIX_DIR, `${safe}.jsonl`);
  const payload = rows.map((row) => JSON.stringify(row)).join("\n");
  fs.writeFileSync(file, `${payload}\n`, "utf8");
  return file;
}
