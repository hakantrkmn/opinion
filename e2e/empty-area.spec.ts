import type { NearestPinResponse } from "../src/types/api";
import { expectJson } from "./support/api";
import { expect, mapCanvas, test } from "./support/fixtures";

/** Central Anatolia, far from any seeded pin. */
const EMPTY = { lat: 38.2, lng: 31.5 };

test.describe("empty area hint", () => {
  test("GET /api/pins/nearest returns the closest pin with a distance", async ({ anonApi }) => {
    const body = await expectJson<NearestPinResponse>(
      await anonApi.get("/api/pins/nearest", { params: { lat: String(EMPTY.lat), lng: String(EMPTY.lng) } }),
      200
    );
    expect(body.pin).not.toBeNull();
    expect(body.pin!.distance_m).toBeGreaterThan(1000);
    expect(body.pin!.comments_count).toBeGreaterThan(0);

    await expectJson(await anonApi.get("/api/pins/nearest", { params: { lat: "91", lng: "0" } }), 400);
  });

  test("an empty viewport points at the nearest opinion and opens it", async ({ page, errors }) => {
    await page.goto(`/?lat=${EMPTY.lat}&lng=${EMPTY.lng}`);
    await expect(mapCanvas(page)).toBeVisible();

    const status = page.getByRole("status").filter({ hasText: "No opinions here yet" });
    await expect(status).toBeVisible();
    const show = page.getByRole("button", { name: /^Show the nearest opinion: (.+), [\d.,]+ k?m away$/ });
    const label = await show.getAttribute("aria-label");
    const pinName = label!.replace(/^Show the nearest opinion: /, "").replace(/, [\d.,]+ k?m away$/, "");

    await show.click();
    await expect(page.getByRole("dialog", { name: pinName })).toBeVisible();
    await expect(status).toBeHidden();
    expect(errors.messages).toEqual([]);
  });
});
