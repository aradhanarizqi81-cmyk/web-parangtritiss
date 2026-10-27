import { test, expect } from "@playwright/test";
import {
  ROLE_EMAILS,
  authStatePath,
  qaPassword,
  type RoleKey,
} from "./env";
import { collectDiagnostics, measureOverflow, screenshotPath } from "./support";

/**
 * Portal operasional /staff/login.
 *
 * Memverifikasi pemisahan portal wisatawan dan portal pegawai: formulir khusus
 * petugas, pengalihan per peran yang berasal dari identitas terverifikasi
 * backend, penolakan wisatawan, serta ketiadaan pengalihan terbuka.
 *
 * Percobaan gagal sengaja memakai email yang tidak ada di seeder supaya limiter
 * 5 percobaan milik akun uji tidak pernah tersentuh.
 */

const STAFF_ROUTES: { role: RoleKey; destination: string }[] = [
  { role: "admin", destination: "/admin" },
  { role: "cashier", destination: "/counter" },
  { role: "gate", destination: "/gate" },
];

const SUBMIT = /masuk ke portal/i;

test.describe("Portal operasional — formulir", () => {
  test("anonim melihat formulir petugas beserta jalan ke portal wisatawan", async ({
    page,
  }) => {
    await page.goto("/staff/login");

    await expect(
      page.getByRole("heading", { name: /masuk petugas/i }),
    ).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: SUBMIT })).toBeVisible();
    await expect(page.getByText(/portal operasional/i).first()).toBeVisible();

    const visitorLink = page.getByRole("link", {
      name: /portal wisatawan/i,
    });
    await expect(visitorLink).toBeVisible();
    await expect(visitorLink).toHaveAttribute("href", "/login");

    await page.screenshot({
      path: screenshotPath("staff-login", "form", "1280x800", "screen"),
      caret: "initial",
    });
  });

  test("tombol tampilkan/sembunyikan mengganti tipe input password", async ({
    page,
  }) => {
    await page.goto("/staff/login");

    const password = page.locator("#password");
    const show = page.getByRole("button", { name: /tampilkan password/i });

    await password.fill("rahasia-dinas");
    await expect(password).toHaveAttribute("type", "password");
    await expect(show).toBeVisible();

    await show.click();
    await expect(password).toHaveAttribute("type", "text");
    // Nama tombol ikut berubah agar sesuai aksi berikutnya.
    await expect(
      page.getByRole("button", { name: /sembunyikan password/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /sembunyikan password/i }).click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(show).toBeVisible();
  });

  test("validasi klien menolak isian kosong dan format email salah", async ({
    page,
  }) => {
    await page.goto("/staff/login");

    await page.getByRole("button", { name: SUBMIT }).click();

    await expect(page.locator("#email-error")).toHaveText(/email wajib diisi/i);
    await expect(page.locator("#password-error")).toHaveText(
      /password wajib diisi/i,
    );
    await expect(page).toHaveURL(/\/staff\/login$/);

    await page.locator("#email").fill("bukan-email");
    await page.locator("#password").fill("rahasia-dinas");
    await page.getByRole("button", { name: SUBMIT }).click();

    await expect(page.locator("#email-error")).toHaveText(
      /format email tidak valid/i,
    );
    await expect(page).toHaveURL(/\/staff\/login$/);
  });

  test("kredensial salah menampilkan pesan dan tetap di portal", async ({
    page,
  }) => {
    await page.goto("/staff/login");

    // Email yang tidak terdaftar: tidak menyentuh limiter akun uji.
    await page.locator("#email").fill("petugas.tidak.ada@parangtritis.test");
    await page.locator("#password").fill("password-yang-salah");
    await page.getByRole("button", { name: SUBMIT }).click();

    const emailError = page.locator("#email-error");
    await expect(emailError).toBeVisible();
    await expect(emailError).not.toBeEmpty();
    await expect(page).toHaveURL(/\/staff\/login$/);
    await expect(page.getByRole("button", { name: SUBMIT })).toBeEnabled();

    await page.screenshot({
      path: screenshotPath("staff-login", "kredensial-salah", "1280x800", "screen"),
      caret: "initial",
    });
  });

  test("akun wisatawan ditolak dan sesinya tidak ditinggal setengah masuk", async ({
    page,
  }) => {
    await page.goto("/staff/login");

    await page.locator("#email").fill(ROLE_EMAILS.visitor);
    await page.locator("#password").fill(qaPassword());
    await page.getByRole("button", { name: SUBMIT }).click();

    const rejection = page.getByTestId("staff-login-error");
    await expect(rejection).toBeVisible();
    await expect(rejection).toContainText(/wisatawan/i);
    await expect(rejection).toContainText(/portal operasional/i);
    await expect(page).toHaveURL(/\/staff\/login$/);

    await page.screenshot({
      path: screenshotPath("staff-login", "wisatawan-ditolak", "1280x800", "screen"),
      caret: "initial",
    });

    // Cookie sesi sudah dicabut: halaman terproteksi mengembalikan ke /login.
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("Portal operasional — pengalihan per peran", () => {
  for (const { role, destination } of STAFF_ROUTES) {
    test(`${role} diarahkan ke ${destination}`, async ({ page }) => {
      await page.goto("/staff/login");

      await page.locator("#email").fill(ROLE_EMAILS[role]);
      await page.locator("#password").fill(qaPassword());
      await page.getByRole("button", { name: SUBMIT }).click();

      await expect(page).toHaveURL(new RegExp(`${destination}$`));
      await expect(page.getByText(/akses ditolak/i)).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: /masuk petugas/i }),
      ).toHaveCount(0);
    });
  }

  test("parameter pengalihan dari pengguna diabaikan (tanpa open redirect)", async ({
    page,
  }) => {
    await page.goto("/staff/login?next=https://example.com/curi");

    // Portal tidak mengalihkan apa pun sebelum kredensial diverifikasi.
    await expect(page).toHaveURL(/\/staff\/login\?next=/);

    await page.locator("#email").fill(ROLE_EMAILS.cashier);
    await page.locator("#password").fill(qaPassword());
    await page.getByRole("button", { name: SUBMIT }).click();

    // Tujuan berasal dari role yang diverifikasi backend, bukan dari query.
    await expect(page).toHaveURL(/\/counter$/);
    expect(new URL(page.url()).host).not.toContain("example.com");
  });
});

test.describe("Portal operasional — pegawai yang sudah masuk", () => {
  test.use({ storageState: authStatePath("admin") });

  test("admin yang membuka portal diantar ke dasbor tanpa lingkaran", async ({
    page,
  }) => {
    await page.goto("/staff/login");

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: /masuk petugas/i })).toHaveCount(
      0,
    );
  });
});

test.describe("Portal operasional — wisatawan yang sudah masuk", () => {
  test.use({ storageState: authStatePath("visitor") });

  test("melihat penolakan yang jelas, bukan formulir petugas", async ({
    page,
  }) => {
    await page.goto("/staff/login");

    const denied = page.getByTestId("staff-portal-denied");

    await expect(
      denied.getByRole("heading", { name: /portal khusus pegawai/i }),
    ).toBeVisible();
    await expect(denied.getByText(/akses ditolak/i)).toBeVisible();
    await expect(
      denied.getByRole("link", { name: /buka area wisatawan/i }),
    ).toBeVisible();
    await expect(denied.getByRole("button", { name: /keluar/i })).toBeVisible();

    // Formulir petugas tidak dirender untuk sesi wisatawan.
    await expect(page.locator("#password")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /masuk petugas/i }),
    ).toHaveCount(0);
  });
});

test.describe("Portal operasional — keluar lalu masuk kembali", () => {
  test.use({ storageState: authStatePath("cashier") });

  test("sesi dicabut, halaman terkunci lagi, lalu bisa masuk lagi", async ({
    page,
  }) => {
    // Sesi awal sebagai kasir: portal mengantar ke loket.
    await page.goto("/staff/login");
    await expect(page).toHaveURL(/\/counter$/);

    // Keluar lewat tombol di kepala halaman.
    await page.getByRole("button", { name: /keluar/i }).first().click();
    await expect(page).toHaveURL(/\/$/);

    // Halaman terproteksi meminta masuk lagi (cookie sudah dibersihkan)…
    await page.goto("/counter");
    await expect(page).toHaveURL(/\/login$/);

    // …dan portal operasional kembali menampilkan formulir.
    await page.goto("/staff/login");
    await expect(
      page.getByRole("heading", { name: /masuk petugas/i }),
    ).toBeVisible();

    // Masuk kembali, kali ini sebagai petugas gerbang.
    await page.locator("#email").fill(ROLE_EMAILS.gate);
    await page.locator("#password").fill(qaPassword());
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page).toHaveURL(/\/gate$/);
    await expect(page.getByText(/akses ditolak/i)).toHaveCount(0);
  });
});

test.describe("Portal operasional — responsivitas formulir", () => {
  for (const viewport of [
    { name: "360x800", width: 360, height: 800 },
    { name: "390x844", width: 390, height: 844 },
  ]) {
    test(`nyaman dipakai pada ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      const diagnostics = collectDiagnostics(page);

      await page.goto("/staff/login");
      await expect(
        page.getByRole("heading", { name: /masuk petugas/i }),
      ).toBeVisible();

      const overflow = await measureOverflow(page);
      expect(
        overflow.overflowPx,
        `overflow horizontal ${overflow.overflowPx}px — ${overflow.offenders.join(", ")}`,
      ).toBeLessThanOrEqual(1);

      // Sasaran sentuh utama tetap terlihat dan cukup besar untuk jari.
      for (const selector of ["#email", "#password"]) {
        const box = await page.locator(selector).boundingBox();
        expect(box, `${selector} terlihat di ${viewport.name}`).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(40);
      }

      const submit = page.getByRole("button", { name: SUBMIT });
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeVisible();
      const submitBox = await submit.boundingBox();
      expect(submitBox!.height, "sasaran sentuh tombol kirim").toBeGreaterThanOrEqual(
        44,
      );

      await page.screenshot({
        path: screenshotPath(
          "staff-login",
          "form",
          viewport.name,
          "screen",
        ),
        caret: "initial",
      });

      expect(diagnostics.pageErrors, "page errors").toEqual([]);
      expect(diagnostics.consoleErrors, "console errors").toEqual([]);
      expect(diagnostics.failedRequests, "failed requests").toEqual([]);
    });
  }
});
