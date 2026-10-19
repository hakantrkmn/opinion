import type { CreatePinResponse, PinResponse } from "../src/types/api";
import { deleteComment, expectJson } from "./support/api";
import { ISTANBUL, uniqueSuffix } from "./support/env";
import { expect, mapCanvas, signInContext, test } from "./support/fixtures";

test.describe("drop a pin (signed in)", () => {
  test.use({
    geolocation: { latitude: ISTANBUL.lat, longitude: ISTANBUL.lng, accuracy: 8 },
    permissions: ["geolocation"],
  });

  test("creates a pin at the current location", async ({ page, context, freshUser, errors }) => {
    await signInContext(context, freshUser);
    await page.goto("/");
    await expect(mapCanvas(page)).toBeVisible();

    await page.getByRole("button", { name: "Drop a pin" }).click();
    const dialog = page.getByRole("dialog", { name: /What's your droPINion\?/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("At your location")).toBeVisible();

    // Empty submit → inline validation, no request.
    await dialog.getByRole("button", { name: "Drop pin" }).click();
    await expect(dialog.getByText("Give this spot a name.")).toBeVisible();

    const name = `E2E pin ${uniqueSuffix()}`;
    const comment = "Dropped by the Playwright suite.";
    await dialog.getByLabel("Place name").fill(name);
    await dialog.getByLabel("Your opinion").fill(comment);

    const created = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/pins" && r.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Drop pin" }).click();
    const body = (await (await created).json()) as CreatePinResponse;

    await expect(page.getByText("Pin dropped")).toBeVisible();
    await expect(page.locator("[data-sonner-toast]").getByText(name)).toBeVisible();
    await expect(dialog).toBeHidden();

    expect(body.pin.name).toBe(name);
    expect(body.pin.lat).toBeCloseTo(ISTANBUL.lat, 4);
    expect(body.pin.lng).toBeCloseTo(ISTANBUL.lng, 4);
    expect(body.comment.text).toBe(comment);
    expect(body.comment.is_first_comment).toBe(true);

    const fetched = await expectJson<PinResponse>(await freshUser.api.get(`/api/pins/${body.pin.id}`), 200);
    expect(fetched.pin).toMatchObject({ id: body.pin.id, name, comments_count: 1 });
    expect(fetched.pin.user.id).toBe(freshUser.id);
    expect(errors.messages).toEqual([]);

    // Cleanup: deleting the only comment removes the pin too.
    await deleteComment(freshUser.api, body.comment.id);
  });
});

test.describe("drop a pin (location blocked)", () => {
  // No geolocation permission granted → Chromium denies the request.
  test("explains that location access is blocked", async ({ page, context, freshUser }) => {
    await signInContext(context, freshUser);
    await page.goto("/");
    await expect(mapCanvas(page)).toBeVisible();

    await page.getByRole("button", { name: "Drop a pin" }).click();
    await expect(page.getByText("Couldn't get your location")).toBeVisible();
    await expect(page.getByText(/Location access is blocked/)).toBeVisible();
    await expect(page.getByRole("dialog", { name: /What's your droPINion/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Drop a pin" })).toBeEnabled();
  });
});

test.describe("drop a pin (anonymous)", () => {
  test("asks to sign in and never requests the location", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __geoCalls: number };
      w.__geoCalls = 0;
      const geo = navigator.geolocation;
      const getCurrentPosition = geo.getCurrentPosition.bind(geo);
      const watchPosition = geo.watchPosition.bind(geo);
      geo.getCurrentPosition = (...args: Parameters<Geolocation["getCurrentPosition"]>) => {
        w.__geoCalls += 1;
        return getCurrentPosition(...args);
      };
      geo.watchPosition = (...args: Parameters<Geolocation["watchPosition"]>) => {
        w.__geoCalls += 1;
        return watchPosition(...args);
      };
    });
    await page.goto("/");
    await expect(mapCanvas(page)).toBeVisible();
    // The session must have resolved (signed-out header) before clicking.
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await page.getByRole("button", { name: "Drop a pin" }).click();
    const prompt = page.getByRole("dialog", { name: "Sign in to join in" });
    await expect(prompt).toBeVisible();
    await expect(prompt.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth");
    await expect(page.getByRole("dialog", { name: /What's your droPINion/ })).toHaveCount(0);

    expect(await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls)).toBe(0);
  });
});
