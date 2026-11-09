import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { BASE_URL, authStatePath, type RoleKey } from "./env";
import { screenshotPath } from "./support";

/**
 * Alur bisnis end-to-end pada database lokal:
 * booking → simulasi bayar → verifikasi Loket 2 (read-only) → cetak tiket fisik
 * di gerbang → check-in gerbang.
 *
 * Menegaskan aturan yang tidak boleh berubah: token penukaran berbeda dari
 * barcode gerbang, verifikasi loket tidak mengonsumsi token, pencetakan di gate
 * mengonsumsi token tepat sekali, dan pencetakan bukan check-in.
 */

test.describe.configure({ mode: "serial" });

let bookingId = "";
let redemptionToken = "";
let gateToken = "";

async function openRole(
  browser: Browser,
  role: RoleKey,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: authStatePath(role),
  });
  const page = await context.newPage();
  return { context, page };
}

function localToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

test("visitor membuat booking dan menyelesaikan simulasi pembayaran", async ({
  browser,
}) => {
  const { context, page } = await openRole(browser, "visitor");

  try {
    await page.goto("/booking");
    await expect(
      page.getByRole("heading", { name: /booking tiket online/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.locator("#visit_date").fill(localToday());
    await page.locator("#visitor-0-name").fill("Budiyanto QA");
    await page.locator("#visitor-0-nik").fill("3404010101900001");

    await page.getByRole("button", { name: /buat booking/i }).click();
    await page.waitForURL(/\/booking\/\d+$/, { timeout: 40_000 });

    bookingId = new URL(page.url()).pathname.split("/").pop() ?? "";
    expect(bookingId).toMatch(/^\d+$/);

    // Sebelum lunas, kode penukaran tidak boleh tampil.
    await expect(
      page.getByRole("heading", { name: /kode penukaran loket/i }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: /bayar sekarang/i }).click();

    await expect(
      page.getByRole("heading", { name: /kode penukaran loket/i }),
    ).toBeVisible({ timeout: 40_000 });

    const qr = page.locator("[data-qr-value]").first();
    await expect(qr).toBeVisible();
    redemptionToken = (await qr.getAttribute("data-qr-value")) ?? "";

    expect(redemptionToken).toMatch(/^RDM-[A-Z0-9]{24}$/);
    // The same value is printed below the QR, so the code can be typed too.
    await expect(page.getByText(redemptionToken, { exact: true })).toBeVisible();

    // The gate barcode is a different credential. It belongs to the booking,
    // not to the wristband, so it is read from the same BFF the page uses.
    const detail = await page.request.get(`/api/bookings/${bookingId}`);
    expect(detail.ok()).toBeTruthy();
    const payload = (await detail.json()) as {
      data?: { barcode_token?: string };
    };
    gateToken = payload.data?.barcode_token ?? "";

    expect(gateToken).not.toBe("");
    expect(gateToken).not.toBe(redemptionToken);

    await page.screenshot({
      path: screenshotPath("journey", "booking-paid", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });
  } finally {
    await context.close();
  }
});

test("loket 2 memverifikasi booking tanpa mengonsumsi token dan tanpa mencetak gelang", async ({
  browser,
}) => {
  expect(redemptionToken, "token penukaran dari langkah sebelumnya").not.toBe("");

  const { context, page } = await openRole(browser, "cashier");

  try {
    await page.goto("/counter/penukaran");
    await expect(
      page.getByRole("heading", { name: /verifikasi booking online/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Assert the scanned value travels unchanged to the verify BFF.
    const verifiedTokens: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;

      if (
        request.method() !== "POST" ||
        path !== "/api/counter/redemptions/verify"
      ) {
        return;
      }

      const body = request.postDataJSON() as {
        redemption_token?: string;
      } | null;

      if (body?.redemption_token) verifiedTokens.push(body.redemption_token);
    });

    await page.locator("#redemption_token").fill(redemptionToken);
    await page.getByRole("button", { name: /periksa kode/i }).click();

    await expect(
      page.getByRole("heading", { name: /ringkasan pesanan/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Read-only until the officer explicitly verifies, and never a print.
    await expect(page.locator("article.wristband")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /konfirmasi penukaran/i }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: /verifikasi booking/i }).click();

    await expect(
      page.getByText(
        "Booking terverifikasi. Silakan menuju gate untuk pencetakan tiket fisik.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 30_000 });

    expect(verifiedTokens).toContain(redemptionToken);

    // Verification never consumes the token and never renders a wristband.
    await expect(page.locator("article.wristband")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /cetak/i })).toHaveCount(0);

    await page.screenshot({
      path: screenshotPath("journey", "loket2-verified", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });
  } finally {
    await context.close();
  }
});

test("gate mencetak tiket fisik dari QR RDM- dan mengonsumsi token tepat sekali", async ({
  browser,
}) => {
  expect(redemptionToken, "token penukaran dari langkah sebelumnya").not.toBe("");

  const { context, page } = await openRole(browser, "gate");

  try {
    await page.goto("/gate");
    await expect(
      page.getByRole("heading", { name: /^gerbang$/i }),
    ).toBeVisible({ timeout: 30_000 });

    // window.print() dinetralkan agar tidak membuka dialog cetak saat QA.
    await page.evaluate(() => {
      window.print = () => undefined;
    });

    const printedTokens: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;

      if (request.method() !== "POST" || path !== "/api/gate/print") {
        return;
      }

      const body = request.postDataJSON() as { code?: string } | null;
      if (body?.code) printedTokens.push(body.code);
    });

    await page.locator("#gate_print_code").fill(redemptionToken);
    await page.getByRole("button", { name: /cari booking/i }).click();

    await expect(
      page.getByText("Ringkasan booking", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // Lookup is read-only: no wristband and no print before the explicit action.
    await expect(page.locator("article.wristband")).toHaveCount(0);

    await page.getByRole("button", { name: /cetak tiket fisik/i }).click();

    await expect(page.locator("article.wristband")).toHaveCount(1, {
      timeout: 30_000,
    });

    expect(printedTokens).toContain(redemptionToken);

    // The wristband encodes the stable individual ticket code, never the
    // redemption or gate credential.
    const wristbandBarcode = page
      .locator('article.wristband [aria-label^="Barcode kode tiket individual "]')
      .first();
    await expect(wristbandBarcode).toBeVisible();
    const ticketCode = ((await wristbandBarcode.getAttribute("aria-label")) ?? "")
      .replace("Barcode kode tiket individual ", "")
      .trim();

    expect(ticketCode).toMatch(/^TKT-\d{8}-[A-Z0-9]{8}$/);
    expect(ticketCode).not.toBe(redemptionToken);
    expect(ticketCode).not.toBe(gateToken);

    // Kode penukaran dan barcode gerbang WAJIB berbeda.
    expect(gateToken).not.toBe("");
    expect(gateToken).not.toBe(redemptionToken);
    expect(gateToken.startsWith("RDM-")).toBeFalsy();

    await page.screenshot({
      path: screenshotPath("journey", "gate-tickets-printed", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });

    // A second lookup of the same token is rejected: it was consumed once.
    await page.locator("#gate_print_code").fill(redemptionToken);
    await page.getByRole("button", { name: /cari booking/i }).click();

    await expect(page.locator('p[role="alert"]').first()).toContainText(
      /sudah ditukarkan/i,
      { timeout: 30_000 },
    );
    await expect(page.locator("article.wristband")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("gate: scan pertama berhasil, scan kedua ditolak (bukti cetak bukan check-in)", async ({
  browser,
}) => {
  expect(gateToken, "barcode gerbang dari langkah booking").not.toBe("");

  const { context, page } = await openRole(browser, "gate");

  try {
    await page.goto("/gate");
    await expect(
      page.getByRole("heading", { name: /^gerbang$/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.locator("#barcode_token").fill(gateToken);
    await page.locator("#barcode_token").press("Enter");

    await expect(
      page.getByRole("heading", { name: /check-in berhasil/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.screenshot({
      path: screenshotPath("journey", "gate-success", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });

    await page.locator("#barcode_token").fill(gateToken);
    await page.locator("#barcode_token").press("Enter");

    await expect(
      page.getByRole("heading", { name: /tiket sudah pernah check-in/i }),
    ).toBeVisible({ timeout: 30_000 });
  } finally {
    await context.close();
  }
});

test("token yang sudah dicetak tidak dapat dicetak ulang dan tidak menggandakan tiket", async ({
  browser,
}) => {
  expect(redemptionToken).not.toBe("");

  const { context, page } = await openRole(browser, "gate");

  try {
    await page.goto("/gate");
    await expect(
      page.getByRole("heading", { name: /^gerbang$/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.locator("#gate_print_code").fill(redemptionToken);
    await page.getByRole("button", { name: /cari booking/i }).click();

    await expect(page.locator('p[role="alert"]').first()).toContainText(
      /sudah ditukarkan/i,
      { timeout: 30_000 },
    );

    // No second wristband, and the check-in state is untouched.
    await expect(page.locator("article.wristband")).toHaveCount(0);

    await page.locator("#barcode_token").fill(gateToken);
    await page.locator("#barcode_token").press("Enter");

    await expect(
      page.getByRole("heading", { name: /tiket sudah pernah check-in/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.screenshot({
      path: screenshotPath("journey", "gate-token-used", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });
  } finally {
    await context.close();
  }
});
