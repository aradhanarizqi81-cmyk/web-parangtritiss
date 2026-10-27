import { test, expect } from "@playwright/test";
import { BASE_URL, authStatePath } from "./env";
import { screenshotPath } from "./support";

/**
 * Pengujian interaksi & regresi yang menyasar langsung perbaikan P1/P2:
 * - P1-2: ekspor CSV menangani sesi kedaluwarsa tanpa JSON mentah.
 * - P2-2/P2-3: scan gate tidak hilang tanpa feedback; gangguan sistem tidak
 *   dilaporkan sebagai "Validasi ditolak".
 * - P2-4/P2-5: penukaran gagal memberi pesan di dekat tombol dan pratinjau
 *   disegarkan agar tidak mengulang aksi yang mustahil.
 */

function localToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

test.describe("Ekspor CSV (P1-2)", () => {
  test.use({ storageState: authStatePath("admin") });

  test("mengunduh berkas CSV saat sesi valid", async ({ page }) => {
    await page.goto("/admin/laporan/kunjungan");
    await expect(
      page.getByRole("heading", { name: /laporan kunjungan/i }),
    ).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: /unduh csv/i }).first().click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test("sesi kedaluwarsa: pesan inline, halaman tetap utuh (bukan JSON mentah)", async ({
    page,
  }) => {
    await page.goto("/admin/laporan/kunjungan");
    await expect(
      page.getByRole("heading", { name: /laporan kunjungan/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.context().clearCookies();
    await page.getByRole("button", { name: /unduh csv/i }).first().click();

    // Hanya alert inline milik tombol; Next.js route-announcer juga memakai
    // role="alert", jadi scope ke elemen paragraf.
    const inlineAlert = page.locator('p[role="alert"]').first();
    await expect(inlineAlert).toContainText(
      /sesi|masuk kembali|gagal|ditolak/i,
    );

    // Tetap di halaman laporan, bukan dokumen JSON.
    expect(new URL(page.url()).pathname).toBe("/admin/laporan/kunjungan");
    await expect(
      page.getByRole("heading", { name: /laporan kunjungan/i }),
    ).toBeVisible();

    const bodyText = (await page.locator("body").innerText()).trim();
    expect(bodyText.startsWith("{")).toBeFalsy();

    await page.screenshot({
      path: screenshotPath("interactions", "export-expired-session", "1280x800", "screen"),
      caret: "initial",
    });
  });
});

test.describe("Gate: feedback scan (P2-2/P2-3)", () => {
  test.use({ storageState: authStatePath("gate") });

  test("gangguan jaringan ditampilkan sebagai gangguan sistem, bukan 'Validasi ditolak'", async ({
    page,
  }) => {
    await page.goto("/gate");
    await expect(
      page.getByRole("heading", { name: /validasi tiket/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.route("**/api/gate/check-in", (route) => route.abort("failed"));

    await page.locator("#barcode_token").fill("uji-gangguan-jaringan");
    await page.locator("#barcode_token").press("Enter");

    await expect(
      page.getByRole("heading", { name: /tidak dapat memvalidasi/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: /validasi ditolak/i }),
    ).toHaveCount(0);

    await page.unroute("**/api/gate/check-in");
  });

  test("sesi habis (401) menampilkan 'Sesi berakhir' + tautan masuk kembali", async ({
    page,
  }) => {
    await page.goto("/gate");
    await expect(
      page.getByRole("heading", { name: /validasi tiket/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.context().clearCookies();

    await page.locator("#barcode_token").fill("uji-sesi-habis");
    await page.locator("#barcode_token").press("Enter");

    await expect(
      page.getByRole("heading", { name: /sesi berakhir/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("link", { name: /masuk kembali/i }),
    ).toBeVisible();

    await page.screenshot({
      path: screenshotPath("interactions", "gate-session-expired", "1280x800", "screen"),
      caret: "initial",
    });
  });
});

test.describe("Penukaran gagal (P2-4/P2-5)", () => {
  test("pesan muncul di dekat tombol + pratinjau disegarkan, tanpa keadaan berbahaya", async ({
    browser,
  }) => {
    // Siapkan satu booking online yang sudah lunas agar punya token penukaran nyata.
    const visitor = await browser.newContext({
      baseURL: BASE_URL,
      storageState: authStatePath("visitor"),
    });
    const visitorPage = await visitor.newPage();
    let token = "";

    try {
      await visitorPage.goto("/booking");
      await visitorPage.locator("#visit_date").fill(localToday());
      await visitorPage.locator("#visitor-0-name").fill("Tukar Gagal QA");
      await visitorPage.locator("#visitor-0-nik").fill("3404010101900002");
      await visitorPage.getByRole("button", { name: /buat booking/i }).click();
      await visitorPage.waitForURL(/\/booking\/\d+$/, { timeout: 40_000 });
      await visitorPage.getByRole("button", { name: /bayar sekarang/i }).click();

      const qr = visitorPage.locator("[data-qr-value]").first();
      await expect(qr).toBeVisible({ timeout: 40_000 });
      token = (await qr.getAttribute("data-qr-value")) ?? "";
      await expect(visitorPage.getByText(token, { exact: true })).toBeVisible();
    } finally {
      await visitor.close();
    }

    expect(token).toMatch(/^RDM-[A-Z0-9]{24}$/);

    const cashier = await browser.newContext({
      baseURL: BASE_URL,
      storageState: authStatePath("cashier"),
    });
    const page = await cashier.newPage();
    let lookups = 0;
    const lookupTokens: string[] = [];

    try {
      page.on("request", (request) => {
        if (
          request.method() === "POST" &&
          request.url().includes("/api/counter/redemptions/lookup")
        ) {
          lookups += 1;

          const body = request.postDataJSON() as {
            redemption_token?: string;
          } | null;

          if (body?.redemption_token) lookupTokens.push(body.redemption_token);
        }
      });

      // Konfirmasi dipaksa gagal (409) untuk meniru penukaran oleh petugas lain.
      await page.route("**/api/counter/redemptions/confirm", (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Booking sudah ditukarkan petugas lain.",
          }),
        }),
      );

      await page.goto("/counter/penukaran");
      await page.locator("#redemption_token").fill(token);
      await page.getByRole("button", { name: /periksa kode/i }).click();
      await expect(
        page.getByRole("heading", { name: /ringkasan pesanan/i }),
      ).toBeVisible({ timeout: 30_000 });
      expect(lookupTokens).toContain(token);
      await expect(page.locator("article.wristband")).toHaveCount(0);

      const before = lookups;
      await page.getByRole("button", { name: /konfirmasi penukaran/i }).click();

      // P2-4: pesan error muncul tepat di dekat baris tombol.
      await expect(page.locator('p[role="alert"]').first()).toContainText(
        /ditukarkan|ditolak|gagal/i,
      );

      // P2-5: pratinjau diambil ulang otomatis dari backend (sumber kebenaran).
      await expect
        .poll(() => lookups, { timeout: 15_000 })
        .toBeGreaterThan(before);

      // Tidak ada gelang tercetak dan tombol tidak tertinggal di status memproses.
      await expect(page.locator("article.wristband")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /mencatat/i })).toHaveCount(0);

      await page.screenshot({
        path: screenshotPath(
          "interactions",
          "redemption-confirm-failed",
          "1280x800",
          "screen",
        ),
        caret: "initial",
      });
    } finally {
      await cashier.close();
    }
  });
});

test.describe("Paginasi laporan (P2-10)", () => {
  test.use({ storageState: authStatePath("admin") });

  test("halaman berikutnya memuat parameter page dan label halaman berganti", async ({
    page,
  }) => {
    await page.goto(
      "/admin/laporan/kunjungan?date_from=2026-10-01&date_to=2026-10-31&per_page=5",
    );
    await expect(
      page.getByRole("heading", { name: /laporan kunjungan/i }),
    ).toBeVisible({ timeout: 30_000 });

    const nav = page.getByRole("navigation", { name: /navigasi halaman/i });
    await expect(nav).toBeVisible();
    await expect(nav).toContainText(/halaman 1 dari/i);

    await nav.getByRole("link", { name: /berikutnya/i }).click();

    await expect(nav).toContainText(/halaman 2 dari/i);
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");
    await expect(
      nav.getByRole("link", { name: /sebelumnya/i }),
    ).toBeVisible();
  });
});
