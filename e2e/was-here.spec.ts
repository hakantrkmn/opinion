import type { ApiError, CommentResponse } from "../src/types/api";
import { createPin, deleteComment, expectJson, signUpUser, type TestUser } from "./support/api";
import { ISTANBUL } from "./support/env";
import { expect, mapCanvas, signInContext, test } from "./support/fixtures";

/** A spot near Sultanahmet, randomized so runs don't collide. */
function spot() {
  return { lat: ISTANBUL.lat + Math.random() * 0.004, lng: ISTANBUL.lng + Math.random() * 0.004 };
}

const fixAt = (p: { lat: number; lng: number }, dLat = 0) => ({
  user_lat: p.lat + dLat,
  user_lng: p.lng,
  accuracy: 10,
});

test.describe("Was here (API)", () => {
  test.describe.configure({ mode: "serial" });
  let owner: TestUser;
  let visitor: TestUser;
  let at: { lat: number; lng: number };
  let pinId: string;
  const cleanup: Array<{ user: () => TestUser; id: string }> = [];

  test.beforeAll(async () => {
    [owner, visitor] = await Promise.all([signUpUser(), signUpUser()]);
    at = spot();
    const created = await createPin(owner.api, { name: "E2E was-here pin", comment: "Opening take", at });
    pinId = created.pin.id;
    cleanup.push({ user: () => owner, id: created.comment.id });
    expect(created.comment.verified_visit).toBe(true);
  });

  test.afterAll(async () => {
    for (const c of cleanup.reverse()) await deleteComment(c.user().api, c.id);
    await Promise.all([owner?.api.dispose(), visitor?.api.dispose()]);
  });

  test("a far fix posts normally but without the badge; PATCH near adds it", async () => {
    const posted = await expectJson<CommentResponse>(
      await visitor.api.post(`/api/pins/${pinId}/comments`, {
        data: { text: "From the sofa", ...fixAt(at, 0.05) }, // ≈ 5.5 km
      }),
      201
    );
    cleanup.push({ user: () => visitor, id: posted.comment.id });
    expect(posted.comment.verified_visit).toBe(false);

    const far = await expectJson<ApiError>(
      await visitor.api.patch(`/api/comments/${posted.comment.id}`, { data: fixAt(at, 0.05) }),
      422
    );
    expect(far.code).toBe("TOO_FAR");

    const near = await expectJson<CommentResponse>(
      await visitor.api.patch(`/api/comments/${posted.comment.id}`, { data: fixAt(at) }),
      200
    );
    expect(near.comment.verified_visit).toBe(true);
    // Not an edit: text and updated_at unchanged.
    expect(near.comment.text).toBe("From the sofa");
    expect(near.comment.updated_at).toBe(posted.comment.updated_at);
  });

  test("partial fixes are rejected", async () => {
    const res = await visitor.api.post(`/api/pins/${pinId}/comments`, {
      data: { text: "half a fix", user_lat: at.lat },
    });
    expect((await expectJson<ApiError>(res, 400)).code).toBe("VALIDATION_ERROR");
  });
});

test.describe("Was here (UI)", () => {
  const at = spot();
  test.use({
    geolocation: { latitude: at.lat, longitude: at.lng, accuracy: 8 },
    permissions: ["geolocation"],
  });

  test("I'm here → the posted opinion shows the badge", async ({ page, context, freshUser, errors }) => {
    const owner = await signUpUser();
    const created = await createPin(owner.api, { name: `E2E here ${Date.now()}`, comment: "Owner says hi", at });
    try {
      await signInContext(context, freshUser);
      await page.goto(`/?pin=${created.pin.id}&lat=${at.lat}&lng=${at.lng}`);
      await expect(mapCanvas(page)).toBeVisible();
      const panel = page.getByRole("dialog", { name: created.pin.name });
      await expect(panel).toBeVisible();

      await panel.getByRole("button", { name: /I'm here/ }).click();
      await expect(panel.getByText("You're here: your opinion gets a “Was here” badge.")).toBeVisible();
      await panel.getByLabel("Your comment").fill("Standing right here");
      const posted = page.waitForResponse(
        (r) => r.url().endsWith(`/api/pins/${created.pin.id}/comments`) && r.request().method() === "POST"
      );
      await panel.getByRole("button", { name: "Post comment" }).click();
      const body = (await (await posted).json()) as CommentResponse;
      expect(body.comment.verified_visit).toBe(true);

      const card = panel.locator("article").filter({ hasText: "Standing right here" });
      await expect(card.getByText("Was here")).toBeVisible();
      expect(errors.messages).toEqual([]);
      await deleteComment(freshUser.api, body.comment.id);
    } finally {
      await deleteComment(owner.api, created.comment.id);
      await owner.api.dispose();
    }
  });
});
