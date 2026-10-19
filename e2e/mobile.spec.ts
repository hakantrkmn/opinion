import { pickPin } from "./support/api";
import { storageStatePath } from "./support/env";
import { expect, isMapRequest, mapCanvas, pinPanel, test } from "./support/fixtures";

/* Runs in the "mobile" project (Pixel 7 emulation). */

test.describe("mobile (anonymous)", () => {
  test("map loads with clusters and the floating controls", async ({ page, errors }) => {
    const clusters = page.waitForResponse(isMapRequest("/api/pins/clusters", "all"));
    await page.goto("/");
    await expect(mapCanvas(page)).toBeVisible();
    expect((await clusters).status()).toBe(200);

    const viewport = page.viewportSize()!;
    const drop = page.getByRole("button", { name: "Drop a pin" });
    await expect(drop).toBeVisible();
    const box = (await drop.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await expect(page.getByRole("radiogroup", { name: "Whose pins to show" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
    expect(errors.messages).toEqual([]);
  });

  test("pin detail opens as a bottom sheet", async ({ page, anonApi }) => {
    const pin = await pickPin(anonApi);
    await page.goto(`/?pin=${pin.id}&lat=${pin.lat}&lng=${pin.lng}`);

    const sheet = pinPanel(page, pin.name);
    await expect(sheet).toBeVisible();
    // Wait for the slide-up animation to settle, then check it is docked to
    // the bottom edge, full width.
    const viewport = page.viewportSize()!;
    await expect
      .poll(async () => {
        const b = await sheet.boundingBox();
        return b ? Math.round(b.y + b.height) : -1;
      })
      .toBe(viewport.height);
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(box.y).toBeGreaterThan(0); // a sheet, not a full-screen page

    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
    await expect(page).not.toHaveURL(/pin=/);
  });
});

test.describe("mobile (signed in)", () => {
  test.use({ storageState: storageStatePath("user1") });

  test("header collapses account actions into a menu", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    const trigger = header.getByRole("button", { name: "Account menu" });
    await expect(trigger).toBeVisible();
    // Desktop-only text buttons are hidden on phones.
    await expect(header.getByRole("button", { name: "Sign out" })).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("menu", { name: "Account" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Profile" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Admin panel" })).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeHidden();

    await trigger.click();
    await menu.getByRole("menuitem", { name: "Profile" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/profile");
  });
});
