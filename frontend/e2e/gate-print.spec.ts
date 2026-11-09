import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { ARTIFACTS_DIR, BASE_URL, authStatePath, type RoleKey } from "./env";
import { screenshotPath } from "./support";

/**
 * Regresi cetak gate: tiket yang tampil di layar harus benar-benar muncul pada
 * media cetak. Bug sebelumnya berasal dari `print:hidden` pada ancestor yang
 * membungkus seluruh formulir, sehingga Chrome hanya mencetak halaman kosong.
 *
 * Pengujian ini memakai alur asli (booking → bayar → lookup gate → cetak),
 * lalu memeriksa DOM pada media cetak dan menghasilkan PDF sungguhan lewat
 * `page.pdf()`. Jumlah halaman PDF diperiksa agar tidak ada halaman kosong.
 */

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

/** Mengurai stream PDF hasil Chromium untuk memastikan ada isi yang digambar. */
function inflatePdfStreams(pdf: Buffer): string[] {
  const raw = pdf.toString("latin1");
  const streams: string[] = [];
  const marker = /stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;

    const slice = Buffer.from(raw.slice(start, end), "latin1");

    try {
      streams.push(zlib.inflateSync(slice).toString("latin1"));
    } catch {
      streams.push(slice.toString("latin1"));
    }
  }

  return streams;
}

test.describe.configure({ mode: "serial" });

test("dua tiket gate tercetak utuh tanpa halaman kosong", async ({
  browser,
}) => {
  // 1. Booking online dengan dua pengunjung, lalu lunasi.
  const { context: visitorContext, page: visitorPage } = await openRole(
    browser,
    "visitor",
  );

  let redemptionToken = "";

  try {
    await visitorPage.goto("/booking");
    await expect(
      visitorPage.getByRole("heading", { name: /booking tiket online/i }),
    ).toBeVisible({ timeout: 30_000 });

    await visitorPage.locator("#visit_date").fill(localToday());
    await visitorPage.locator("#visitor-0-name").fill("Cetak Satu");
    await visitorPage.locator("#visitor-0-nik").fill("3404010101900011");

    await visitorPage
      .getByRole("button", { name: /tambah pengunjung/i })
      .click();
    await visitorPage.locator("#visitor-1-name").fill("Cetak Dua");
    await visitorPage.locator("#visitor-1-nik").fill("3404010101900012");

    await visitorPage
      .getByRole("button", { name: /buat booking/i })
      .click();
    await visitorPage.waitForURL(/\/booking\/\d+$/, { timeout: 40_000 });

    await visitorPage
      .getByRole("button", { name: /bayar sekarang/i })
      .click();
    await expect(
      visitorPage.getByRole("heading", { name: /kode penukaran loket/i }),
    ).toBeVisible({ timeout: 40_000 });

    redemptionToken =
      (await visitorPage
        .locator("[data-qr-value]")
        .first()
        .getAttribute("data-qr-value")) ?? "";

    expect(redemptionToken).toMatch(/^RDM-[A-Z0-9]{24}$/);
  } finally {
    await visitorContext.close();
  }

  // 2. Petugas gate mencetak tiket fisik.
  const { context: gateContext, page } = await openRole(browser, "gate");

  try {
    await page.goto("/gate");
    await expect(
      page.getByRole("heading", { name: /^gerbang$/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Netralkan dialog cetak, tetapi hitung pemanggilannya agar timing tetap
    // dapat diperiksa tanpa interaksi dengan dialog native. Jumlah gelang
    // dicatat PADA SAAT print() dipanggil: bila gelang belum ada di DOM ketika
    // itu, Chrome akan mencetak halaman kosong meski layar sudah menampilkan
    // tiket beberapa milidetik kemudian.
    await page.evaluate(() => {
      type PrintProbe = {
        __printCalls: number;
        __printSnapshot: {
          tickets: number;
          bands: number;
          barcodes: number;
        } | null;
      };

      const probe = window as unknown as PrintProbe;
      probe.__printCalls = 0;
      probe.__printSnapshot = null;

      window.print = () => {
        probe.__printCalls += 1;
        probe.__printSnapshot = {
          tickets: document.querySelectorAll(".gate-print-area .print-ticket")
            .length,
          bands: document.querySelectorAll(
            ".gate-print-area article.wristband",
          ).length,
          barcodes: document.querySelectorAll(
            ".gate-print-area .ticket-barcode-svg",
          ).length,
        };
      };
    });

    const printRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/gate/print"
      ) {
        const body = request.postDataJSON() as { code?: string } | null;
        if (body?.code) printRequests.push(body.code);
      }
    });

    await page.locator("#gate_print_code").fill(redemptionToken);
    await page.getByRole("button", { name: /cari booking/i }).click();

    await expect(
      page.getByText("Ringkasan booking", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // Lookup read-only: belum ada gelang dan belum ada dialog cetak.
    await expect(page.locator("article.wristband")).toHaveCount(0);
    expect(printRequests).toHaveLength(0);
    expect(
      await page.evaluate(
        () => (window as unknown as { __printCalls: number }).__printCalls,
      ),
    ).toBe(0);

    await page.getByRole("button", { name: /cetak tiket fisik/i }).click();

    await expect(page.locator("article.wristband")).toHaveCount(2, {
      timeout: 30_000,
    });

    expect(printRequests).toEqual([redemptionToken]);

    // Dialog cetak baru dipanggil setelah gelang masuk ke DOM.
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as unknown as { __printCalls: number }).__printCalls,
          ),
        { timeout: 10_000 },
      )
      .toBe(1);

    expect(
      await page.evaluate(
        () =>
          (
            window as unknown as {
              __printSnapshot: {
                tickets: number;
                bands: number;
                barcodes: number;
              } | null;
            }
          ).__printSnapshot,
      ),
      "gelang dan barcode harus sudah ada di DOM saat print() dipanggil",
    ).toEqual({ tickets: 2, bands: 2, barcodes: 2 });

    await expect(page.locator(".gate-print-area .print-ticket")).toHaveCount(2);

    // 3. Media cetak: hanya area tiket yang terlihat.
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(200);

    for (const selector of [
      "body > header",
      "body > footer",
      "#gate_print_code",
    ]) {
      await expect(page.locator(selector)).toBeHidden();
    }

    await expect(
      page.getByRole("button", { name: /cari booking/i }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: /cetak tiket fisik/i }),
    ).toBeHidden();
    await expect(
      page.getByRole("heading", { name: /^gerbang$/i }),
    ).toBeHidden();
    await expect(
      page.getByText("Ringkasan booking", { exact: true }),
    ).toBeHidden();

    const hostDisplay = await page
      .locator(".gate-print-host")
      .evaluate((element) => getComputedStyle(element).display);
    expect(hostDisplay).not.toBe("none");

    const areaDisplay = await page
      .locator(".gate-print-area")
      .evaluate((element) => getComputedStyle(element).display);
    expect(areaDisplay).not.toBe("none");

    const tickets = page.locator(".gate-print-area .print-ticket");
    const names: string[] = [];
    const barcodes: string[] = [];

    for (const ticket of await tickets.all()) {
      const wristband = ticket.locator("article.wristband");

      await expect(wristband).toBeVisible();
      await expect(wristband.locator(".wristband-brand-title")).toBeVisible();
      await expect(wristband.locator(".wristband-code-value")).toBeVisible();
      await expect(wristband.locator(".ticket-barcode-svg")).toBeVisible();
      await expect(wristband.locator(".wristband-date-value")).toBeVisible();
      await expect(wristband.locator(".wristband-date-greeting")).toBeVisible();

      names.push(
        (await wristband.locator(".wristband-date-name").innerText()).trim(),
      );
      barcodes.push(
        (await wristband
          .locator(".ticket-barcode-svg")
          .getAttribute("aria-label")) ?? "",
      );

      const clipping = await wristband.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        breakInside: getComputedStyle(element).breakInside,
      }));

      expect(clipping.scrollHeight).toBeLessThanOrEqual(
        clipping.clientHeight + 1,
      );
      expect(clipping.breakInside).toBe("avoid");

      const offPage = await wristband.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width <= 0 || rect.height <= 0;
      });
      expect(offPage).toBe(false);
    }

    expect(names.sort()).toEqual(["Cetak Dua", "Cetak Satu"]);
    expect(new Set(barcodes).size).toBe(2);

    await page.screenshot({
      path: screenshotPath(
        "gate-print",
        "print-media",
        "1280x800",
        "print",
      ),
      fullPage: true,
      caret: "initial",
    });

    // 4. Ukuran kertas nyata: A4 (210mm) dikurangi margin @page 8mm per sisi
    // menyisakan 194mm = 733px CSS. Tiket harus muat penuh, tidak terpotong,
    // dan kedua gelang berada pada halaman pertama.
    await page.setViewportSize({ width: 733, height: 1000 });
    await page.waitForTimeout(200);

    const paper = await page.evaluate(() => {
      const bands = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".gate-print-area .print-ticket",
        ),
      ).map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });

      return {
        bands,
        bodyWidth: document.body.scrollWidth,
        viewport: window.innerWidth,
      };
    });

    expect(
      paper.bodyWidth,
      "tidak boleh ada overflow horizontal pada media cetak",
    ).toBeLessThanOrEqual(paper.viewport);
    expect(paper.bands).toHaveLength(2);

    for (const band of paper.bands) {
      expect(band.left).toBe(0);
      expect(band.width).toBeGreaterThan(600);
      expect(band.height).toBeGreaterThan(60);
    }

    expect(
      paper.bands[1].top,
      "gelang kedua masih di area halaman pertama",
    ).toBeLessThan(200);

    // 5. Hasil cetak nyata: PDF satu halaman berisi konten tiket.
    const pdfDir = path.join(ARTIFACTS_DIR, "pdf");
    fs.mkdirSync(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, "gate-print-tickets.pdf");

    const pdf = await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(pdf.byteLength).toBeGreaterThan(10_000);

    const rawPdf = pdf.toString("latin1");
    const pageCount = (rawPdf.match(/\/Type\s*\/Page\b/g) ?? []).length;
    expect(pageCount, "PDF harus tepat satu halaman").toBe(1);

    const content = inflatePdfStreams(pdf).join("\n");
    const rectangles = (content.match(/\bre\b/g) ?? []).length;
    const textShows = (content.match(/\bT[jJ]\b/g) ?? []).length;

    // Konten tiket adalah vektor (panel + bar barcode), bukan halaman kosong.
    expect(rectangles).toBeGreaterThan(20);
    expect(textShows).toBeGreaterThan(5);

    /*
     * Chrome mencetak dengan "Background graphics" nonaktif secara default.
     * PDF kedua membuktikan pratinjau tetap berisi tiket pada pengaturan itu
     * (print-color-adjust: exact membuat panel tetap ikut tercetak).
     */
    const pdfNoBackground = await page.pdf({
      path: path.join(pdfDir, "gate-print-tickets-tanpa-background.pdf"),
      format: "A4",
      printBackground: false,
    });

    expect(
      (pdfNoBackground.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? [])
        .length,
      "PDF tanpa background harus tetap satu halaman",
    ).toBe(1);

    const noBackgroundContent = inflatePdfStreams(pdfNoBackground).join("\n");
    expect((noBackgroundContent.match(/\bre\b/g) ?? []).length).toBeGreaterThan(
      20,
    );
    expect((noBackgroundContent.match(/T[jJ]/g) ?? []).length).toBeGreaterThan(
      5,
    );

    // 6. Membuka dialog cetak lagi tidak mengirim POST /api/gate/print.
    await page.emulateMedia({ media: "screen" });
    const beforeReprint = printRequests.length;

    await page.getByRole("button", { name: /cetak ulang di browser/i }).click();
    await page.waitForTimeout(300);

    expect(printRequests).toHaveLength(beforeReprint);
    expect(redemptionToken).not.toBe("");
  } finally {
    await gateContext.close();
  }
});
