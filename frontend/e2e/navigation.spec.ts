import { test, expect } from "@playwright/test";
import { screenshotPath } from "./support";

/**
 * Perilaku header/navigasi: laci mobile (drawer) vs baris nav desktop.
 * Memvalidasi perbaikan P2-1 (sebelumnya header membungkus sampai ~5 baris).
 */

test.describe("Navigasi header", () => {
  test("drawer mobile: buka, backdrop, Escape, dan menutup saat viewport melebar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForTimeout(500);

    const menuButton = page.getByRole("button", { name: /menu navigasi/i });
    const drawer = page.locator("#site-header-drawer");

    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(drawer).toHaveCount(0);

    await menuButton.click();
    await expect(drawer).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(
      await page.evaluate(() => document.body.style.overflow),
      "scroll body terkunci saat laci terbuka",
    ).toBe("hidden");

    await page.screenshot({
      path: screenshotPath("navigation", "drawer-open", "390x844", "screen"),
      caret: "initial",
    });

    // Escape menutup laci.
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );

    // Klik backdrop menutup laci.
    await menuButton.click();
    await expect(drawer).toBeVisible();
    await page.mouse.click(20, 400);
    await expect(drawer).toHaveCount(0);

    // Melebarkan viewport ke desktop menutup laci dan melepas kunci scroll.
    await menuButton.click();
    await expect(drawer).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(drawer).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
    await expect(
      page.getByRole("navigation", { name: "Navigasi utama" }).first(),
    ).toBeVisible();
  });

  test("header bertumpuk wajar di mobile (tinggi <= 110px)", async ({ page }) => {
    for (const width of [360, 375, 430]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.waitForTimeout(400);

      const box = await page.locator("header").first().boundingBox();
      expect(box, `header ada di ${width}px`).not.toBeNull();
      expect(box!.height, `tinggi header di ${width}px`).toBeLessThanOrEqual(110);
    }
  });

  test("nav desktop dan tombol menu bergantian di breakpoint md (768px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /menu navigasi/i })).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(
      page.getByRole("button", { name: /menu navigasi/i }),
    ).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Navigasi utama" }).first(),
    ).toBeVisible();
  });
});
