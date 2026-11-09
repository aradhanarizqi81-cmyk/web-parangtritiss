import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Penjaga pengkabelan untuk formulir cetak gate. Komponennya membutuhkan
 * kamera/DOM sehingga tidak diimpor langsung di lingkungan uji node; yang
 * dijaga di sini adalah kontrak yang mudah rusak tanpa terlihat: kamera
 * memakai hook bersama, lookup dan cetak memakai endpoint BFF yang berbeda,
 * kode non-RDM ditolak di klien, dan tidak ada jalan pintas ke check-in.
 */
const source = readFileSync(
  fileURLToPath(new URL("./gate-print-form.tsx", import.meta.url)),
  "utf8",
);

const pageSource = readFileSync(
  fileURLToPath(new URL("./page.tsx", import.meta.url)),
  "utf8",
);

const printCss = readFileSync(
  fileURLToPath(new URL("../print.css", import.meta.url)),
  "utf8",
);

describe("GatePrintForm wiring", () => {
  it("uses the shared camera scanner hook", () => {
    expect(source).toContain('from "@/lib/gate/use-camera-scanner"');
    expect(source).toContain("useCameraScanner(");
    expect(source).toContain("stopCamera()");
  });

  it("calls the gate print lookup BFF and then the print BFF", () => {
    expect(source).toContain('"/api/gate/print/lookup"');
    expect(source).toContain('"/api/gate/print"');

    const lookupAt = source.indexOf('"/api/gate/print/lookup"');
    const printAt = source.indexOf('"/api/gate/print"', lookupAt + 1);

    expect(lookupAt).toBeGreaterThan(-1);
    expect(printAt).toBeGreaterThan(lookupAt);
  });

  it("only looks up redemption tokens and never posts to check-in", () => {
    expect(source).toContain('"RDM-"');
    expect(source).toContain("startsWith");
    expect(source).not.toContain("/api/gate/check-in");
    expect(source).not.toContain("barcode_token");
  });

  it("does not print automatically during lookup", () => {
    const lookupAt = source.indexOf('"/api/gate/print/lookup"');
    const firstPrintCall = source.indexOf("window.print(");

    // The lookup block is closed before any browser print dialog is opened.
    const lookupBlockEnd = source.indexOf("} finally {", lookupAt);

    expect(lookupAt).toBeGreaterThan(-1);
    expect(lookupBlockEnd).toBeGreaterThan(lookupAt);
    expect(firstPrintCall).toBeGreaterThan(lookupBlockEnd);
  });

  it("renders wristbands inside a dedicated printable area", () => {
    expect(source).toContain("gate-print-host");
    expect(source).toContain("gate-print-area");
    expect(source).toContain("print-ticket");
    expect(printCss).toContain(".gate-print-area");
    expect(printCss).toContain(".print-ticket");
  });

  it("never hides the ancestor that wraps the wristbands in print media", () => {
    // Regresi: `print:hidden` pada wrapper GatePrintForm membuat Chrome
    // mencetak halaman kosong karena tiket ikut tersembunyi.
    expect(pageSource).not.toContain("mt-6 print:hidden");
    expect(pageSource).toContain("<GatePrintForm />");
  });

  it("opens the print dialog only after the tickets have rendered", () => {
    expect(source).toContain("requestAnimationFrame");
    expect(source).toContain("document.fonts");
    expect(source).not.toContain("setTimeout(() => window.print");
  });
});
