import type { PinClustersResponse, PinsInBoundsResponse } from "../src/types/api";
import { storageStatePath } from "./support/env";
import { expect, isMapRequest, mapCanvas, test } from "./support/fixtures";

test.describe("map (anonymous)", () => {
  test("loads the map and server clusters at the default zoom without errors", async ({
    page,
    errors,
  }) => {
    const clusters = page.waitForResponse(isMapRequest("/api/pins/clusters", "all"));
    await page.goto("/");

    await expect(mapCanvas(page)).toBeVisible();
    const res = await clusters;
    expect(res.status()).toBe(200);
    const url = new URL(res.url());
    expect(Number(url.searchParams.get("zoom"))).toBeLessThan(12);
    const body = (await res.json()) as PinClustersResponse;
    expect(body.clusters.length).toBeGreaterThan(0);

    await expect(page.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: "Drop a pin" })).toBeVisible();
    expect(errors.messages).toEqual([]);
  });

  test("requests individual pins at zoom >= 12", async ({ page, errors }) => {
    const pins = page.waitForResponse(isMapRequest("/api/pins", "all"));
    // ?lat&lng starts the map at the deep-link zoom (16).
    await page.goto("/?lat=41.0082&lng=28.9784");

    await expect(mapCanvas(page)).toBeVisible();
    const res = await pins;
    expect(res.status()).toBe(200);
    const body = (await res.json()) as PinsInBoundsResponse;
    expect(body.pins.length).toBeGreaterThan(0);
    expect(typeof body.truncated).toBe("boolean");
    expect(errors.messages).toEqual([]);
  });

  test("zooming in from clusters to >= 12 switches to /api/pins", async ({ page }) => {
    const clusters = page.waitForResponse(isMapRequest("/api/pins/clusters"));
    await page.goto("/"); // default view: zoom 10
    expect((await clusters).status()).toBe(200);

    const pins = page.waitForResponse(isMapRequest("/api/pins", "all"));
    await mapCanvas(page).focus();
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Equal"); // MapLibre keyboard zoom-in
      await page.waitForTimeout(350); // let each zoom animation finish
    }
    expect((await pins).status()).toBe(200);
  });

  test("Following scope asks anonymous users to sign in", async ({ page }) => {
    await page.goto("/?scope=following");
    await expect(mapCanvas(page)).toBeVisible();
    const status = page.getByRole("status").filter({ hasText: "people you follow" });
    await expect(status).toBeVisible();
    await expect(status.getByRole("button", { name: "Sign in" })).toBeVisible();

    // Clicking the toggle itself opens the sign-in prompt instead of switching.
    await page.goto("/");
    await page.getByRole("radio", { name: "Following" }).click();
    const prompt = page.getByRole("dialog", { name: "Sign in to join in" });
    await expect(prompt).toBeVisible();
    await expect(page).not.toHaveURL(/scope=following/);
    await prompt.getByRole("button", { name: "Not now" }).click();
    await expect(prompt).toBeHidden();
  });
});

test.describe("map (signed in)", () => {
  test.use({ storageState: storageStatePath("user1") });

  test("scope toggle switches the request scope", async ({ page, errors }) => {
    const all = page.waitForResponse(isMapRequest("/api/pins/clusters", "all"));
    await page.goto("/");
    expect((await all).status()).toBe(200);

    const following = page.waitForResponse(isMapRequest("/api/pins/clusters", "following"));
    await page.getByRole("radio", { name: "Following" }).click();
    expect((await following).status()).toBe(200);
    await expect(page.getByRole("radio", { name: "Following" })).toHaveAttribute("aria-checked", "true");
    await expect(page).toHaveURL(/[?&]scope=following/);
    // Signed in: no "sign in to see" hint.
    await expect(page.getByRole("status").filter({ hasText: "Sign in" })).toHaveCount(0);

    await page.getByRole("radio", { name: "All" }).click();
    await expect(page.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
    await expect(page).not.toHaveURL(/scope=/);
    expect(errors.messages).toEqual([]);
  });
});

test.describe("first visit", () => {
  test.use({ dismissIntro: false });

  test("welcome card shows once and stays dismissed", async ({ page }) => {
    await page.goto("/");
    const welcome = page.getByRole("region", { name: "Welcome" });
    await expect(welcome).toBeVisible();
    await welcome.getByRole("button", { name: "Dismiss welcome message" }).click();
    await expect(welcome).toBeHidden();
    await page.reload();
    await expect(mapCanvas(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Drop a pin" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Welcome" })).toHaveCount(0);
  });
});
