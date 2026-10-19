import type { AdminAnalytics } from "../src/types/userTypes";
import { newApi } from "./support/api";
import { storageStatePath } from "./support/env";
import { expect, test } from "./support/fixtures";

/*
 * Admin screens are being polished concurrently: role/label selectors only.
 */
test.describe("admin (admin user)", () => {
  test.use({ storageState: storageStatePath("admin") });

  test("opens /admin and shows stats", async ({ page }) => {
    const analyticsResponse = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/admin/analytics" && r.request().method() === "GET"
    );
    await page.goto("/admin");
    await expect(page).toHaveURL((url) => url.pathname === "/admin");

    const res = await analyticsResponse;
    expect(res.status()).toBe(200);
    const { analytics } = (await res.json()) as { analytics: AdminAnalytics };
    expect(analytics.total_users).toBeGreaterThan(0);
    expect(analytics.total_pins).toBeGreaterThan(0);

    await expect(page.getByRole("tab", { name: /Overview/ })).toBeVisible();
    for (const label of ["Members", "Pins", "Comments"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });
});

test.describe("admin (normal user)", () => {
  test.use({ storageState: storageStatePath("user1") });

  test("a normal user hitting /admin is redirected to /", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL((url) => url.pathname === "/");
  });

  test("admin API rejects a normal user", async () => {
    const api = await newApi({ storageState: storageStatePath("user1") });
    const res = await api.get("/api/admin/analytics");
    expect(res.status()).toBe(403);
    await api.dispose();
  });
});

test.describe("admin (anonymous)", () => {
  test("anonymous /admin goes to sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL((url) => url.pathname === "/auth" && url.searchParams.get("redirect") === "/admin");
  });
});
