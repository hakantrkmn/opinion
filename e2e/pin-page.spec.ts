import type { PinCommentsResponse } from "../src/types/api";
import { createPin, deleteComment, expectJson, signInUser, signUpUser } from "./support/api";
import { ISTANBUL, uniqueSuffix, uniqueTestIp } from "./support/env";
import { expect, signInContext, test } from "./support/fixtures";

const AUTH_TIMEOUT = { timeout: 30_000 };

function spot() {
  return { lat: ISTANBUL.lat + Math.random() * 0.004, lng: ISTANBUL.lng + Math.random() * 0.004 };
}

test.describe("shareable pin page", () => {
  test("link previews quote the best opinion; /api/og ignores free text", async ({ anonApi, page }) => {
    const owner = await signUpUser();
    const created = await createPin(owner.api, {
      name: `E2E share ${uniqueSuffix()}`,
      comment: "Best simit in town, trust me",
      at: spot(),
    });
    try {
      await page.goto(`/pin/${created.pin.id}`);
      const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute("content");
      expect(ogImage).toContain(`/api/og/pin/${created.pin.id}`);
      const description = await page.locator('meta[property="og:description"]').getAttribute("content");
      expect(description).toContain("Best simit in town, trust me");

      const image = await anonApi.get(`/api/og/pin/${created.pin.id}`);
      expect(image.status()).toBe(200);
      expect(image.headers()["content-type"]).toContain("image/png");
      expect((await anonApi.get("/api/og/pin/does-not-exist")).status()).toBe(200);

      // Same image for any title: the query string can't put words on the card.
      const a = await (await anonApi.get("/api/og?type=default&title=Free%20money")).body();
      const b = await (await anonApi.get("/api/og?type=default")).body();
      expect(a.equals(b)).toBe(true);
    } finally {
      await deleteComment(owner.api, created.comment.id);
      await owner.api.dispose();
    }
  });

  test("signed in: post an opinion right on the page", async ({ page, context, freshUser }) => {
    const owner = await signUpUser();
    const created = await createPin(owner.api, { name: `E2E page ${uniqueSuffix()}`, comment: "Owner's view", at: spot() });
    try {
      await signInContext(context, freshUser);
      await page.goto(`/pin/${created.pin.id}`);
      const form = page.locator("#your-opinion");
      await form.getByLabel(/What do you think about/).fill("Agree, lovely spot");
      await form.getByRole("button", { name: "Post opinion" }).click();
      await expect(page.getByText("Yours is opinion #2 here.")).toBeVisible();
      await expect(page.locator("article").filter({ hasText: "Agree, lovely spot" })).toBeVisible();

      const comments = await expectJson<PinCommentsResponse>(
        await freshUser.api.get(`/api/pins/${created.pin.id}/comments`),
        200
      );
      if (comments.my_comment_id) await deleteComment(freshUser.api, comments.my_comment_id);
    } finally {
      await deleteComment(owner.api, created.comment.id);
      await owner.api.dispose();
    }
  });

  test("visitor: write first, sign up, the draft is posted", async ({ page }) => {
    const ip = uniqueTestIp();
    await page.route("**/api/auth/**", (route) =>
      route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } })
    );
    const owner = await signUpUser();
    const created = await createPin(owner.api, { name: `E2E draft ${uniqueSuffix()}`, comment: "Owner first", at: spot() });
    const suffix = uniqueSuffix();
    const email = `e2e-draft-${suffix}@example.test`;
    const password = `pw-${suffix}-UI`;
    try {
      await page.goto(`/pin/${created.pin.id}`);
      const form = page.locator("#your-opinion");
      await form.getByLabel(/What do you think about/).fill("Written before I had an account");
      await form.getByRole("button", { name: "Continue" }).click();

      await expect(page).toHaveURL(/\/auth\?mode=signup/);
      await page.getByLabel("Display name").fill(`E2E Draft ${suffix.slice(-5)}`);
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page).toHaveURL((url) => url.pathname === `/pin/${created.pin.id}`, AUTH_TIMEOUT);
      await expect(page.getByText("Yours is opinion #2 here.")).toBeVisible(AUTH_TIMEOUT);
      await expect(page.locator("article").filter({ hasText: "Written before I had an account" })).toBeVisible();
      expect(await page.evaluate((id) => localStorage.getItem(`dropinion:pin-draft:${id}`), created.pin.id)).toBeNull();

      const visitor = await signInUser(email, password);
      const comments = await expectJson<PinCommentsResponse>(
        await visitor.api.get(`/api/pins/${created.pin.id}/comments`),
        200
      );
      expect(comments.my_comment_id).not.toBeNull();
      await deleteComment(visitor.api, comments.my_comment_id!);
      await visitor.api.dispose();
    } finally {
      await deleteComment(owner.api, created.comment.id);
      await owner.api.dispose();
    }
  });

  test("a leftover draft is offered back, never posted by itself", async ({ page, context, freshUser }) => {
    const owner = await signUpUser();
    const created = await createPin(owner.api, { name: `E2E stale ${uniqueSuffix()}`, comment: "Owner", at: spot() });
    try {
      await signInContext(context, freshUser);
      // A draft from earlier (e.g. someone else on this browser), no resume marker.
      await context.addInitScript(([id]) => {
        localStorage.setItem(`dropinion:pin-draft:${id}`, JSON.stringify({ text: "Not mine to post", at: Date.now() }));
      }, [created.pin.id]);
      await page.goto(`/pin/${created.pin.id}`);
      await expect(page.locator("#pin-page-opinion")).toHaveValue("Not mine to post");
      await page.waitForTimeout(1500);
      const comments = await expectJson<PinCommentsResponse>(
        await freshUser.api.get(`/api/pins/${created.pin.id}/comments`),
        200
      );
      expect(comments.my_comment_id).toBeNull();
    } finally {
      await deleteComment(owner.api, created.comment.id);
      await owner.api.dispose();
    }
  });
});
