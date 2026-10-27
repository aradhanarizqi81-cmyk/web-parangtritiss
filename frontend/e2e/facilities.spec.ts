import { expect, request, test } from "@playwright/test";
import { BASE_URL, authStatePath } from "./env";
import { screenshotPath } from "./support";

/**
 * Alur klaim fasilitas per tiket individual:
 * penjualan loket lunas → tiket belum check-in (ditolak) → check-in gerbang →
 * klaim "Minuman Gratis" di meja fasilitas → klaim kedua tidak tersedia.
 *
 * Tiket dibuat lewat API BFF dengan cookie sesi asli, lalu UI diuji seperti
 * petugas memindai kode tiket pada gelang. Database QA harus sudah menjalankan
 * `php artisan db:seed --class=FacilitySeeder`.
 */

test.describe.configure({ mode: "serial" });

function localToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

test("kasir mengklaim fasilitas hanya setelah tiket check-in", async ({
  browser,
}) => {
  const cashierApi = await request.newContext({
    baseURL: BASE_URL,
    storageState: authStatePath("cashier"),
  });
  const gateApi = await request.newContext({
    baseURL: BASE_URL,
    storageState: authStatePath("gate"),
  });

  let ticketCode = "";
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: authStatePath("cashier"),
  });
  const page = await context.newPage();

  try {
    const created = await cashierApi.post("/api/counter/transactions", {
      data: {
        visit_date: localToday(),
        visitors: [{ full_name: "Fasilitas QA", nik: "3404010101900002" }],
      },
    });

    expect(created.ok()).toBeTruthy();
    const createdBody = (await created.json()) as {
      data: {
        id: number;
        barcode_token: string;
        tickets: { ticket_code: string }[];
      };
    };
    const transaction = createdBody.data;

    expect(transaction.tickets).toHaveLength(1);
    ticketCode = transaction.tickets[0].ticket_code;
    expect(ticketCode).toMatch(/^TKT-\d{8}-[A-Z0-9]{8}$/);

    const confirmed = await cashierApi.post(
      `/api/counter/transactions/${transaction.id}/confirm-payment`,
    );
    expect(confirmed.ok()).toBeTruthy();

    // Sebelum check-in: pratinjau boleh, klaim harus ditolak.
    await page.goto("/counter/fasilitas");
    await expect(
      page.getByRole("heading", { name: /klaim fasilitas/i }),
    ).toBeVisible({ timeout: 30_000 });
    // Tunggu React terpasang agar klik tidak jatuh sebelum handler aktif.
    await page.locator('[data-ready="true"]').waitFor({
      state: "attached",
      timeout: 30_000,
    });

    await page.locator("#ticket_code").fill(ticketCode);
    await page.getByRole("button", { name: /periksa tiket/i }).click();

    await expect(
      page.getByRole("heading", { name: /ringkasan tiket/i }),
    ).toBeVisible({ timeout: 30_000 });
    // Kode tiket hanya boleh ada di body POST, tidak pernah di URL.
    expect(new URL(page.url()).search).toBe("");
    await expect(page.getByText("Minuman Gratis")).toBeVisible();
    await expect(page.getByText("Belum check-in", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/tiket belum check-in di gerbang/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /klaim minuman gratis/i }),
    ).toHaveCount(0);

    // Check-in gerbang lewat API, lalu klaim lewat UI.
    const checkedIn = await gateApi.post("/api/gate/check-in", {
      data: { barcode_token: transaction.barcode_token },
    });
    expect(checkedIn.status()).toBe(201);

    await page.locator("#ticket_code").fill(ticketCode);
    await page.getByRole("button", { name: /periksa tiket/i }).click();

    const claimButton = page.getByRole("button", {
      name: /klaim minuman gratis/i,
    });
    await expect(claimButton).toBeVisible({ timeout: 30_000 });
    await claimButton.click();

    await expect(
      page.getByRole("status").filter({ hasText: /berhasil dicatat/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Sudah Diklaim")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /klaim minuman gratis/i }),
    ).toHaveCount(0);

    await page.screenshot({
      path: screenshotPath("facilities", "claimed", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });

    // Membuka ulang tiket yang sama menunjukkan riwayat klaim, bukan tombol
    // klaim baru.
    await page.getByRole("button", { name: /tiket baru/i }).click();
    await page.locator("#ticket_code").fill(ticketCode);
    await page.getByRole("button", { name: /periksa tiket/i }).click();

    await expect(page.getByText("Sudah Diklaim")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("button", { name: /klaim minuman gratis/i }),
    ).toHaveCount(0);
  } finally {
    await context.close();
    await cashierApi.dispose();
    await gateApi.dispose();
  }
});
