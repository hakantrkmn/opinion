import type { OwnProfileResponse, PublicUserResponse } from "../src/types/userTypes";
import type { CommentResponse } from "../src/types/api";
import { createPin, deleteComment, expectJson, pickPin, postComment } from "./support/api";
import { SEEDED, uniqueSuffix } from "./support/env";
import { expect, signInContext, test } from "./support/fixtures";

/*
 * Profile screens are being polished concurrently: role/label selectors only.
 */
test.describe("own profile", () => {
  test("edit display name", async ({ page, context, freshUser }) => {
    await signInContext(context, freshUser);
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1, name: freshUser.name })).toBeVisible();

    const next = `E2E Renamed ${uniqueSuffix().slice(-5)}`;
    await page.getByRole("button", { name: "Edit display name" }).click();
    await page.getByRole("textbox", { name: "Display name" }).fill(next);
    await page.getByRole("button", { name: "Save display name" }).click();

    await expect(page.getByRole("heading", { level: 1, name: next })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Display name" })).toHaveCount(0);

    const me = await expectJson<OwnProfileResponse>(await freshUser.api.get("/api/profile"), 200);
    expect(me.profile.display_name).toBe(next);
  });

  test("lists the user's pins and comments", async ({ page, context, freshUser }) => {
    const pinName = `E2E profile pin ${uniqueSuffix()}`;
    const created = await createPin(freshUser.api, { name: pinName, comment: "E2E opinion" });
    const other = await pickPin(freshUser.api, (p) => p.id !== created.pin.id && !p.name.startsWith("E2E"));
    const commentText = `E2E profile comment ${uniqueSuffix()}`;
    const comment = await expectJson<CommentResponse>(
      await postComment(freshUser.api, other.id, commentText),
      201
    );

    try {
      await signInContext(context, freshUser);
      await page.goto("/profile");

      await expect(page.getByRole("tab", { name: /Pins/ })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel").getByText(pinName)).toBeVisible();

      await page.getByRole("tab", { name: /Comments/ }).click();
      const panel = page.getByRole("tabpanel");
      await expect(panel.getByText(commentText)).toBeVisible();
      await expect(panel.getByText(other.name)).toBeVisible();
    } finally {
      await deleteComment(freshUser.api, comment.comment.id);
      await deleteComment(freshUser.api, created.comment.id); // last comment → pin removed
    }
  });
});

test.describe("public profile", () => {
  test("follow / unfollow toggles", async ({ page, context, freshUser }) => {
    const target = SEEDED.user5.id;
    const profile = await expectJson<PublicUserResponse>(await freshUser.api.get(`/api/users/${target}`), 200);
    const name = profile.user.display_name!;
    expect(profile.viewer.is_following).toBe(false);
    const followers = profile.stats.followers_count;

    await signInContext(context, freshUser);
    await page.goto(`/u/${target}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    const followResponse = page.waitForResponse(
      (r) => r.url().endsWith(`/api/users/${target}/follow`) && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: `Follow ${name}`, exact: true }).click();
    expect((await followResponse).status()).toBe(200);
    const following = page.getByRole("button", { name: new RegExp(`^Following ${name}`) });
    await expect(following).toBeVisible();

    let state = await expectJson<PublicUserResponse>(await freshUser.api.get(`/api/users/${target}`), 200);
    expect(state.viewer.is_following).toBe(true);
    expect(state.stats.followers_count).toBe(followers + 1);

    const unfollowResponse = page.waitForResponse(
      (r) => r.url().endsWith(`/api/users/${target}/follow`) && r.request().method() === "DELETE"
    );
    await following.click();
    expect((await unfollowResponse).status()).toBe(200);
    await expect(page.getByRole("button", { name: `Follow ${name}`, exact: true })).toBeVisible();

    state = await expectJson<PublicUserResponse>(await freshUser.api.get(`/api/users/${target}`), 200);
    expect(state.viewer.is_following).toBe(false);
  });
});
