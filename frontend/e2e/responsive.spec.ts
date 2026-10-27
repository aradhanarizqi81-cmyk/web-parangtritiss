import { test, expect } from "@playwright/test";
import { VIEWPORTS, authStatePath, type RoleKey } from "./env";
import {
  collectDiagnostics,
  measureOverflow,
  recordMatrixRows,
  screenshotPath,
  type MatrixRow,
} from "./support";

/**
 * Matriks responsivitas: untuk setiap halaman, ukur lebar gulir dokumen pada
 * seluruh viewport wajib dan catat overflow horizontal, error konsol, serta
 * permintaan yang gagal. Satu test = satu halaman (semua viewport di dalamnya)
 * supaya laporan bisa menunjuk viewport mana yang bermasalah.
 */

type PageCase = { name: string; path: string };

const PUBLIC_PAGES: PageCase[] = [
  { name: "landing", path: "/" },
  { name: "login", path: "/login" },
  { name: "staff-login", path: "/staff/login" },
  { name: "register", path: "/register" },
];

const VISITOR_PAGES: PageCase[] = [
  { name: "booking-form", path: "/booking" },
  { name: "booking-history", path: "/booking/history" },
  { name: "profile", path: "/profile" },
  { name: "booking-detail", path: "/booking/13" },
];

const ADMIN_PAGES: PageCase[] = [
  { name: "admin-dashboard", path: "/admin" },
  { name: "admin-kunjungan", path: "/admin/laporan/kunjungan" },
  { name: "admin-transaksi", path: "/admin/laporan/transaksi" },
  { name: "admin-kendaraan", path: "/admin/laporan/kendaraan" },
  { name: "admin-identitas", path: "/admin/laporan/identitas" },
];

const CASHIER_PAGES: PageCase[] = [
  { name: "counter-dashboard", path: "/counter" },
  { name: "counter-penukaran", path: "/counter/penukaran" },
  { name: "counter-transaction-detail", path: "/counter/transactions/21" },
];

const GATE_PAGES: PageCase[] = [{ name: "gate-checkin", path: "/gate" }];

function runMatrix(group: string, pages: PageCase[], role?: RoleKey) {
  test.describe(group, () => {
    if (role) {
      test.use({ storageState: authStatePath(role) });
    }

    for (const pageCase of pages) {
      test(`${pageCase.name} — ${pageCase.path}`, async ({ page }, testInfo) => {
        const diagnostics = collectDiagnostics(page);
        const rows: MatrixRow[] = [];
        const failures: string[] = [];

        let consoleSeen = 0;
        let pageErrorSeen = 0;
        let requestSeen = 0;

        for (const viewport of VIEWPORTS) {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });

          let navigationError: string | null = null;

          try {
            await page.goto(pageCase.path, { waitUntil: "domcontentloaded" });
            await page.waitForTimeout(700);
          } catch (error) {
            navigationError = (error as Error).message;
          }

          const landedOn = new URL(page.url()).pathname;
          const redirectedToLogin =
            landedOn === "/login" && pageCase.path !== "/login";

          const consoleErrors = diagnostics.consoleErrors.slice(consoleSeen);
          const pageErrors = diagnostics.pageErrors.slice(pageErrorSeen);
          const failedRequests = diagnostics.failedRequests.slice(requestSeen);
          consoleSeen = diagnostics.consoleErrors.length;
          pageErrorSeen = diagnostics.pageErrors.length;
          requestSeen = diagnostics.failedRequests.length;

          if (redirectedToLogin) {
            rows.push({
              group,
              page: pageCase.name,
              path: pageCase.path,
              viewport: viewport.name,
              overflowPx: 0,
              offenders: [],
              consoleErrors,
              pageErrors,
              failedRequests,
              status: "BLOCKED",
              note: "dialihkan ke /login",
            });
            continue;
          }

          if (navigationError) {
            rows.push({
              group,
              page: pageCase.name,
              path: pageCase.path,
              viewport: viewport.name,
              overflowPx: 0,
              offenders: [],
              consoleErrors,
              pageErrors,
              failedRequests,
              status: "BLOCKED",
              note: `navigasi gagal: ${navigationError}`,
            });
            failures.push(`${viewport.name}: navigasi gagal — ${navigationError}`);
            continue;
          }

          const overflow = await measureOverflow(page);
          const hasOverflow = overflow.overflowPx > 1;
          const status: MatrixRow["status"] =
            hasOverflow || pageErrors.length > 0 ? "FAIL" : "PASS";

          rows.push({
            group,
            page: pageCase.name,
            path: pageCase.path,
            viewport: viewport.name,
            overflowPx: overflow.overflowPx,
            offenders: overflow.offenders,
            consoleErrors,
            pageErrors,
            failedRequests,
            status,
          });

          if (status === "FAIL") {
            failures.push(
              [
                `${viewport.name}:`,
                hasOverflow ? `overflow ${overflow.overflowPx}px` : "",
                overflow.offenders.length
                  ? `pelanggar: ${overflow.offenders.join(", ")}`
                  : "",
                pageErrors.length ? `pageerror: ${pageErrors.join(" | ")}` : "",
              ]
                .filter(Boolean)
                .join(" "),
            );
          }

          await page
            .screenshot({
              path: screenshotPath(group, pageCase.name, viewport.name, "screen"),
              fullPage: true,
              caret: "initial",
            })
            .catch(() => undefined);
        }

        recordMatrixRows(`${group}__${pageCase.name}`, rows);

        testInfo.annotations.push({
          type: "matrix",
          description: rows
            .map((row) => `${row.viewport}=${row.status}`)
            .join(", "),
        });

        expect(failures, failures.join("\n")).toEqual([]);
      });
    }
  });
}

runMatrix("public", PUBLIC_PAGES);
runMatrix("visitor", VISITOR_PAGES, "visitor");
runMatrix("admin", ADMIN_PAGES, "admin");
runMatrix("cashier", CASHIER_PAGES, "cashier");
runMatrix("gate", GATE_PAGES, "gate");
